var yaq_app= (function(){
    var self = {};

	var options = {
		"base64Encode" : false
	};
	
	var quizz = [];
	
	/*String constants*/
	var texts = {
		"True" : "V",
		"False": "F",
		"dontKnow": "?",
		"gradeButtonText": "Corriger",
		"resetButtonText": "Recommencer",
		"solveButtonText": "Montrer la solution",
		"wrongMathVariableError": "L'expression contient une variable inconnue, les variables connues sont : ",
		"wrongMathSyntaxError": "L'expression contient une erreur de syntaxe.",
		"wrongMathError": "Expression mathematique : erreur inconnue."
	};

	function getDefault (tryValue, defaultValue)
	{
		if(tryValue === undefined)
			return defaultValue;
		return tryValue;
	}
	function blink(elem) {
		elem.fadeOut(300).fadeIn(300);
	}
	
	var QuestionStateEnum ={
			"unsolved": 1,
			"correct": 2,
			"wrong": 4,
			"solved": 8
		}
	
	var ActivityStateEnum = {
			"ongoing" : 1,
			"solvable" :2,
			"ended" : 4
		}
	
	var questionConstructors = {};

	function MathVariableError(message) {
		this.message = message;
		this.name = "MathVariable";
	 }
	
	/*
	var saveStateLocal = function(key, value, callBack)
	{
		var result;
		try{
			Cookies.set(key, value, { expires: 365*100, path: '' });
			result=true;
		} catch(e)
		{
			console.log(e);
			console.log("YAQ local save failed.");
			result=false;
		}
		callBack(result);
	}
	
	var loadStateLocal = function(uid, callBack)
	{
		var value = Cookies.get(uid);
		if(value)
		{
			try {
				value = JSON.parse(value);	
				callBack(value);
			}
			catch (e) {
			   console.log(e);
			   console.log("YAQ: Error while loading cookie.");
			}
		}
		
	}*/
	
	/*self.__saveFunction = saveStateLocal;
	self.__loadFunction = loadStateLocal;
	
	self.saveState = function(uid, callBack)
	{
		if(quizz[uid])
		{
			self.__saveFunction(uid, quizz[uid].model, callBack);
		}
		else{
			callBack(false);
		}
	}
	
	self.loadState = function(uid, callBack)
	{
		if(quizz[uid])
		{
			self.__loadFunction(uid, callBack);
		}
	}*/
	
	function arrayClear(array)
	{
		array.splice(0,array.length);
	}

	function isObject(val) {
		if (val === null) { return false;}
		return ( (typeof val === 'function') || (typeof val === 'object') );
	}
	
	var PersistenceWidget = (function(){
		
		var localSaveProvider = function(){
			
			this.save = function(key, timestamp, payload, sucessCallback, errorCallback){
				try{
					//////////////////Cookies.set(key + "-timestamp", timestamp, { expires: 365*100, path: '' });
					//Cookies.set(key, {t:timestamp,l:payload}, { expires: 365*100, path: '' });
					if(sucessCallback)
						sucessCallback();
				} catch(e)
				{
					console.log(e);
					if(errorCallback)
						errorCallback(e);
				}
			}
			
			this.getLatestTimestamp = function(key, sucessCallback, errorCallback){
				//var value = Cookies.get(key);
				var value = undefined;
				if(value)
					value = +value.t;	
				else value = -1;
				sucessCallback(value);
			}
			
			this.load = function(key, sucessCallback, errorCallback){
				//var value = Cookies.get(key);
				var value = undefined;
				if(value)
				{
					try {
						value = JSON.parse(value);	
						sucessCallback(value);
					}
					catch (e) {
						if(errorCallback)
							errorCallback(e);
					}
				}else{
					if(errorCallback)
						errorCallback("Cookie read: no such key " + key);
				}
			}
		};
		
		
		var firebaseSaveProvider = function(user){
			var userId = firebase.auth().currentUser.uid;
			var name = user.displayName;
			var email = user.email;
			var path = window.location.pathname;
			function updateUserData(){
				try{
					database.ref('users/' + userId + '/profile/').set({ name: name,  email: email	});
				}catch(e)
				{
					console.log('failed saving user data');
				}
			}
			updateUserData();

			this.transformKey = function(key){
				return (path + '-' + key).replace(/[\.\$\#\[\]\/]*/g,'');
			}
			
			this.save = function(key, timestamp, payload, sucessCallback, errorCallback){
				try{
					key = this.transformKey(key);
					var updates = {};
					updates['/users/' + userId + '/times/' +key] = timestamp;
					updates['/users/' + userId + '/quizz/' +key] = payload;
					database.ref().update(updates);
					if(sucessCallback)
						sucessCallback();
				} catch(e)
				{
					console.log(e);
					console.log('failed saving user data');
					if(errorCallback)
						errorCallback(e);
				}
			}
			
			this.getLatestTimestamp = function(key, sucessCallback, errorCallback){
				key = this.transformKey(key);
				firebase.database().ref('users/' + userId + '/times/' + key).once('value').then(
				(function(sucessCallback,snapshot) { sucessCallback(+snapshot.val());}).bind(this,sucessCallback));
			}
			
			this.load = function(key, sucessCallback, errorCallback){
				key = this.transformKey(key);
				firebase.database().ref('users/' + userId + '/quizz/' + key).once('value').then(
				(function(sucessCallback,snapshot) { sucessCallback(JSON.parse(snapshot.val()));}).bind(this,sucessCallback));
			}
		};
		
		function PersistenceWidget()
		{
			this.localProvider = new localSaveProvider();
			this.provider = undefined;
			this.localPendingSaves = {};
			this.pendingSaves = {};
			var modal;
			var localDelay = 2*1000 // 2 secondes
			var delay = 2*60*1000; // 2 minutes
			var widget;
			var loginButton;
			var logoutButton;
			var chooseLocal=false;
			var deactivateFirebase=true;
			
			function saveOne(provider, store, key)
			{
				var timestamp = + new Date();
				
				var value = store[key];
				delete store[key];
				var payload;
				if(isObject(value))
					payload = JSON.stringify(value);
				else payload = value;
				provider.save(key, timestamp, payload);
				
			}
			
			function flushStore(provider, store, key)
			{
				if(provider)
				{
					var keys;
					if(key)
						keys = [key];
					else
						keys = Object.keys(store);
					keys.forEach(
						(saveOne).bind(this,provider,store)
					);
				}
			}
			
			this.flushSaveLocal = function(key)
			{
				flushStore(this.localProvider, this.localPendingSaves, key);
			}
			
			this.flushSaveCloud = function(key)
			{
				if(this.provider)
					flushStore(this.provider, this.pendingSaves, key);
			}
			
			
			this.flushSave = function(cloud, key){
				//widget.find("#wmsg").html("flush " + cloud);
				if(cloud)
					this.flushSaveCloud(key);
				this.flushSaveLocal(key);
			};
			
			
			this.saveLocal = function(key, payload){
				if($.isEmptyObject(this.localPendingSaves))
					setTimeout(this.flushSave.bind(this,false),localDelay);
				this.localPendingSaves[key] = payload;
			};
			
			this.saveCloud = function(key, payload){
				if($.isEmptyObject(this.pendingSaves))
					setTimeout(this.flushSave.bind(this,true),delay);
				this.pendingSaves[key] = payload;
			};
			
			this.save = function(key, payload){
				//widget.find("#wmsg").html("save " + key);
				this.saveLocal(key, payload);
				this.saveCloud(key, payload);
			};
			
			this.load = function(key, sucessCallback, errorCallback){
				this.localProvider.getLatestTimestamp(key,
					(function onSucess(key, sucessCallback, errorCallback, localTimeStamp){
						if(this.provider)
						{
							this.provider.getLatestTimestamp(key,
							(function onSucess(key, sucessCallback, errorCallback, localTimeStamp, cloudTimestamp){
								if(isNaN(localTimeStamp) && isNaN(cloudTimeStamp))
									return;
								if(isNaN(localTimeStamp))
									localTimeStamp = 0;
								if(isNaN(cloudTimeStamp))
									cloudTimeStamp = 0;
								
								if(localTimeStamp>cloudTimestamp)
								{
									this.localProvider.load(key,sucessCallback,errorCallback);
								}else{
									this.provider.load(key,sucessCallback,errorCallback);
								}
								
							}).bind(this, key, sucessCallback, errorCallback, localTimeStamp));
						}else{
							this.localProvider.load(key,sucessCallback ,errorCallback);
						}	
					}).bind(this, key, sucessCallback, errorCallback));
			};
			
			
			this.__sync = function(key, payloadTimestamp, payload, updatePayloadFunction, localTimestamp, cloudTimestamp)
			{
				if(isNaN(localTimestamp))
					localTimestamp = 0;
				if(isNaN(cloudTimestamp))
					cloudTimestamp = 0;
				
				if(localTimestamp === 0 && cloudTimestamp === 0 && payloadTimestamp === 0)
					return;
				
				if(payloadTimestamp >= localTimestamp && payloadTimestamp >= cloudTimestamp) // current model is the most recent
				{
					this.save(key, payload);
				} else if (localTimestamp >= payloadTimestamp && localTimestamp >= cloudTimestamp) //local storage is the most recent
				{
					this.localProvider.load(key,(function(key, updatePayloadFunction, value){
						this.saveCloud(key, value);
						this.flushSave(true);
						updatePayloadFunction(value);
						}).bind(this, key, updatePayloadFunction));
				} else if (cloudTimestamp >= payloadTimestamp && cloudTimestamp >= localTimestamp) //cloud storage is the most recent
				{
					this.provider.load(key,(function(key, updatePayloadFunction, value){
						this.saveLocal(key, value);
						this.flushSave();
						updatePayloadFunction(value);
						}).bind(this, key, updatePayloadFunction));
				}
				
			}
			
			this.sync = function(key, payloadTimestamp, payload, updatePayloadFunction){
				this.localProvider.getLatestTimestamp(key,
					(function onSucess(key, payloadTimestamp, payload, updatePayloadFunction, localTimestamp){
						if(this.provider)
						{
							this.provider.getLatestTimestamp(key,
							(function onSucess(key, payloadTimestamp, payload, updatePayloadFunction, localTimestamp, cloudTimestamp){
								
								this.__sync(key, payloadTimestamp, payload, updatePayloadFunction, localTimestamp, cloudTimestamp);
								
							}).bind(this, key, payloadTimestamp, payload, updatePayloadFunction, localTimestamp));
						}else{
							this.__sync(key, payloadTimestamp, payload, updatePayloadFunction, localTimestamp, -1);
							
						}	
					}).bind(this, key, payloadTimestamp, payload, updatePayloadFunction));
			};
			
			this.setProvider= function(_provider)
			{
				
				this.provider = _provider;
				if(_provider)
				{
					loginButton.addClass("yaq-hidden");
					logoutButton.removeClass("yaq-hidden");
				}else{
					loginButton.removeClass("yaq-hidden");
					logoutButton.addClass("yaq-hidden");
				}
					
				
			}
			
			this.logWithFirebase=function(user){
				if(!user.email.endsWith('esiee.fr'))
				{
					firebase.auth().currentUser.delete();
					this.setProvider(undefined);
					alert('Seul les comptes associés à une adresse esiee.fr sont permis.');
				}else{
					this.setProvider(new firebaseSaveProvider(user));	
				}
				self.SyncAll();
			}
			
			this.login = function()
			{
				fbInitUI((function(user){
					widget.show();
				modal.hide();}).bind(this));
				widget.hide();
				modal.show();
			}
			
			
			function asChosenLocal(){
				return Cookies.get("LocalChoice");
			}
			
			function setLocalChoice(value){
				Cookies.set("LocalChoice", value, { expires: 1, path: '/' });
			}
			
			this.logout = function()
			{
				setLocalChoice(false);
				this.flushSave(true);
				setTimeout(firebase.auth().signOut(),250);// whoups let's say that it will be enough to take care of all pending saves requests
			}
			
			this.init = function(){
				if(!deactivateFirebase && firebase && firebase.apps.length !== 0)
				{
					modal = $('<div id="pwModal" class="yaq-modal"></div>');
					var content = $('<div class="yaq-modal-content"></div>');
					modal.append(content);
					
					content.append('<div class="yaq-modal-header"><h2>Option de sauvegarde</h2></div>');
					content.append("<div class='yaq-modal-body'><p>Pour sauvegarder vos données dans le cloud et retrouver vos données où que vous soyez (compte esiee.fr nécesssaire)<span id='firebaseui-container'></span></p><p>Sinon <span class='yaq-button yaq-interractiveElement' id='localModeBtn'>continuez  sans sauvegarde</span></p></div>");
					content.append('<div class="yaq-modal-footer"></div>');
					content.find('#localModeBtn').click((function(){modal.hide();widget.show();setLocalChoice(true);}).bind(this));
					$('body').append(modal);
					
					
					
					
					
					firebase.auth().onAuthStateChanged((function(user) {
							if(!user)
							{
								this.setProvider(undefined);
								if(!asChosenLocal())
									this.login();
							}else{
								
								this.logWithFirebase(user);
							}
						}).bind(this));
					
				
						
					widget = $('<div class="yaq-persistenceWidget"></div>');
					widget.append('<span id="wmsg"></span>');
					loginButton =  $("<span class='yaq-button yaq-interractiveElement'>Connexion</span>");
					logoutButton =  $("<span class='yaq-button yaq-interractiveElement yaq-hidden'>Deconnexion</span>");
					loginButton.click(this.login.bind(this));
					logoutButton.click(this.logout.bind(this));
					widget.append(loginButton);
					widget.append(logoutButton);
					
					$('body').append(widget);
					widget.show();
				}else{
					setLocalChoice(true);
				}
			}
			
			this.init();
			//modal.show();
		}
		
		return PersistenceWidget;
	})();
	
	
	
	/************************************************************************************
		Class Switch3
	*/
	var Switch3 = (function(){
		function getDefaultModelSwitch3(selectedIndex, enabled) 
		{

			enabled = getDefault(enabled, true);
			selectedIndex = getDefault(selectedIndex, 1);
			
			return {
				"enabled" : enabled,
				"selectedIndex" : selectedIndex,
				"selectedExtraStyles" : [],
			};
		}
		
		function Switch3(_model){
			this.model = getDefaultModelSwitch3();
			this.rootDomElement = undefined;
			this.__buttons = undefined;
			this.__values = [texts["True"], texts["dontKnow"], texts["False"]];
			
			this.__updateSelection= function(){
				var extraStyles = this.model.selectedExtraStyles.join(" ")
				var buttons = this.__buttons;
				buttons.removeClass(extraStyles + " yaq-switch3-button-active yaq-switch3-button-notActive");
				model = this.model;
				buttons.each(function(index, elem){
					if(index === model.selectedIndex)
					{
						$(elem).addClass("yaq-switch3-button-active " + extraStyles);
					}else{
						$(elem).addClass("yaq-switch3-button-notActive");
					}
				});
			}
			
			
			this.__updateEnabled = function(){
				if(this.model.enabled)
				{
					this.__buttons.addClass("yaq-interractiveElement");
					arrayClear(this.model.selectedExtraStyles);
				} else {
					this.model.selectedExtraStyles.push("yaq-switch3-button-disabled");
					this.__buttons.removeClass("yaq-interractiveElement");
				}
			}
		
			this.reset = function(){
				this.model.enabled=true;
				arrayClear(this.model.selectedExtraStyles);
				this.model.selectedIndex = 1;
			};
		
			this.__initEvents = function(){
				
				this.__buttons.click((function(e){
					if(this.model.enabled)
					{
						var newIndex = + $(e.target).attr("data-index");
						if(newIndex !== this.model.selectedIndex)
							this.model.selectedIndex = newIndex;
					}
				}).bind(this));
			}
			
			this.__updateExtraStyles = function(oldExtraStyles){
				if(oldExtraStyles)
				{
					var oldExtraStyles = oldExtraStyles.join(" ");
					this.__buttons.removeClass(oldExtraStyles);
				}
				this.__updateSelection();
			}
		
			this.__initDomElement = function(){
				var root = $('<div class="yaq-switch3"></div>');
				this.rootDomElement = root;
				
				var container = $('<div class="yaq-switch3-buttons"></div>');
				
				for(var i=0; i<3; i++)
				{
					var button = $('<a class="yaq-switch3-button" data-index="' + i + '">' + this.__values[i] + '</a>');
					container.append(button);
				}
				
				this.__buttons = container.children();
				root.append(container);
				this.__updateSelection();
				this.__updateEnabled();
				this.__initEvents();
			}
			
			this.__initDomElement();
			
			this.getModel = function(){return this.model;};
			this.getRootElement = function(){return this.rootDomElement;};
			
			watch(this.model, ["selectedIndex"], this.__updateSelection.bind(this));
			watch(this.model, ["selectedExtraStyles"], (function(prop, action, newvalue, oldvalue){
					this.__updateExtraStyles(oldvalue);
				}).bind(this));     
			watch(this.model, ["enabled"], this.__updateEnabled.bind(this));
			

		}
		

		Switch3.getDefaultModel = getDefaultModelSwitch3;
		
		return Switch3;
	})();

	
	/************************************************************************************
		End Class Switch3
	*/

	/************************************************************************************
		Class FBQuestion
	*/
	
	
	var FBQuestion = (function(){
			
		function getDefaultModel(enabled, state, value) {
			enabled = getDefault(enabled, true);
			state = getDefault(state, QuestionStateEnum.unsolved);
			value = getDefault(value, "");
			return {
				"enabled" : enabled,
				"state": state,
				"value": value
			};
		}
		
		function FBQuestion(params){
		
			
			this.model = getDefaultModel();
			this.__explanation = getDefault(params["explanation"], "");
			this.__flags = getDefault(params["flags"], "");
			this.__answer = getDefault(params["answer"], "");
			this.__size = getDefault(params["size"], 0);
			this.__math_vars = getDefault(params["vars"], {});
			this.__displayedAnswer = getDefault(params["displayed-answer"], this.__answer);
			this.rootDomElement = undefined;
			this.__input = undefined;
			this.__math_tries = 50;
			this.__warningMarker = undefined;
			
			this.__updateEnabled = function(){
				this.__input.prop('disabled', !this.model.enabled);
			};
			
			this.__updateState = function(){
				this.__warningMarker.addClass('yaq-hidden');
			};
			
			this.__updateValue = function(){
				 
				 if(this.__input.val()!==this.model.value){
					this.__input.val(this.model.value);
				 }
					
			};
			
			this.__initDomElement = function(){
				var root = $('<span class="yaq-FBQuestion"></span>');
				this.rootDomElement = root;
				
				var input= $('<input type="text">');
				this.__input = input;
				
				if(this.__size !== 0)
				{
					input.attr("size",this.__size)
				}
				else if(!this.__answser)
				{
					var l = this.__answer.length;
					input.attr('size',Math.max(30,l+Math.round(l*0.2)));
				}
				
				this.__flags.split(',').forEach(function(elem){
					if(elem)
						input.attr("data-" + elem.trim(),'');
				});
				
				input.on('input', (function() {
					this.model.state = QuestionStateEnum.unsolved;
					this.model.value = this.__input.val();
					this.__warningMarker.addClass('yaq-hidden');
				}).bind(this));
				
				root.append(input);

				this.__warningMarker = $("<span class='yaq-hidden' style='font-size:150%;cursor:help;color:orange; margin-right:10px;margin-left:10px;' data-role='warningMarker' title='This is my tooltip'>⚠</span>");
				root.append(this.__warningMarker);

				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				this.model.value = "";
				this.model.state=QuestionStateEnum.unsolved;
				this.model.enabled=true;
				this.__warningMarker.addClass('yaq-hidden');
				
			};
			
			this.getModel = function(){return this.model;};
			
			this.getRootElement = function(){ return this.rootDomElement; };
			
			this.grade = function(){
				
				function floatEqual(a, b) {
					if (a === b) {
						return true;
					}
				
					const diff = Math.abs(a - b);
				
					if (diff < 1e-8) {
						return true;
					}
				
					return diff <= 1e-8 * Math.min(Math.abs(a), Math.abs(b));
				}

				function compareMathExpr(e1, e2, variables, tries)
				{
					for(var i=0; i < tries; i++){
						var scope = {};
						for (const [key, value] of Object.entries(variables)) {
							scope[key] = Math.random()*(value[1] - value[0]) + value[0];
						  }
						var res1 = e1.evaluate(scope);
						var res2 = e2.evaluate(scope);

						if(typeof res1 != 'number' || typeof res2 != 'number'){
							throw new MathVariableError("Some variables wee not substituted")
						}

						if(!floatEqual(res1, res2)){
							return false;
						}  
					}
					return true;
				}

				// compare indivual answers
				function compareValuesFB(cal, ga, fuzzy, nospace, mathEq, math_vars, math_tries, regex)
				{
					var res = false;
					if(nospace)
						ga = ga.replace(/\s/g, '');

					for(var i=0; i<cal.length; i++)
					{
						var flag = false;
						var ca = cal[i];
						
						if(nospace)
							ca = ca.replace(/\s/g, '');
						
						if(mathEq){
							try{
								ca_expr = math.compile(ca);
							} catch {
								window.alert("Failed to parse correct answer, contact website creator: " + ca);
							}
							
							
							ga_expr = math.compile(ga);
							flag = compareMathExpr(ga_expr, ca_expr, math_vars, math_tries);
							
							
						}
						else if(fuzzy)
						{
							flag = quasiEqualString(ca,ga);
						} else if(regex){
							flag = new RegExp(ca).test(ga);
						} 
						else {
							flag = (ca == ga) || (Number(ca) == Number(ga));
						}
						
						if(flag)
						{
							res = true;
							cal.splice(i,1);
							break;
						}
					}
					
					
					return res;
				}
		
				function testAnswer(correctAnswer, givenAnswer, sequence, fuzzy, nospace, mathEq, math_vars, math_tries, regex, ordered)
				{
					var cal;
					var gal;
					if(sequence){
						cal = allTrim(correctAnswer).split(/[\s,;]+/);
						gal = allTrim(givenAnswer).split(/[\s,;]+/);
					}else{
						cal = [correctAnswer];
						gal = [givenAnswer];
					}
					
					var expectedElements=cal.length;
					var correctElements=0;
					var wrongElements=0;
					
					for(var j=0; j<gal.length;j++)
					{
						if(ordered){
							if (compareValuesFB([cal[j]], gal[j], fuzzy, nospace, mathEq, math_vars, math_tries, regex))
								correctElements++;
							else wrongElements++;
						}else{
							if (compareValuesFB(cal, gal[j], fuzzy, nospace, mathEq, math_vars, math_tries, regex))
								correctElements++;
							else wrongElements++;
						}
					}
					if(expectedElements === correctElements && wrongElements === 0)
						return true;
					return false;
				}
		
				q=this.__input;
				
				var gans = this.model.value;
				if(gans)
				{
					var mathEq = q.is('[data-math]');
					var fuzzy = q.is('[data-fuzzy]');
					var sequence = q.is('[data-sequence]');
					var nospace = q.is('[data-nospace]');
					var regex = q.is('[data-regex]');
					var ordered = q.is('[data-ordered]');
					var ans = this.__answer;
					try{
						if(testAnswer(ans, gans, sequence, fuzzy, nospace, mathEq, this.__math_vars, this.__math_tries, regex, ordered))
						{
							this.model.enabled=false;
							this.model.state = QuestionStateEnum.correct;
						}else{
							this.model.state = QuestionStateEnum.wrong;
						}
					} catch (e){
						if (e instanceof MathVariableError) {
							this.__warningMarker[0].title = texts['wrongMathVariableError'] + Object.keys(this.__math_vars).map( function(key){ return key }).join(", ");
						} else if (e instanceof SyntaxError){
							this.__warningMarker[0].title = texts['wrongMathSyntaxError'] + " " + e.message;
						} else {
							this.__warningMarker[0].title = texts['wrongMathError'] + e.message;
						}
						this.__warningMarker.removeClass('yaq-hidden');
						blink(q);
					}
				}else{
					blink(q);
				}

			};
			
			this.solve = function(){
				this.model.value = this.__displayedAnswer;
				this.model.enabled = false;
				this.model.state = QuestionStateEnum.solved;
			};
			
			this.__initDomElement();

			watch(this.model, "state", this.__updateState.bind(this));
			watch(this.model, "enabled", this.__updateEnabled.bind(this));
			watch(this.model, "value", this.__updateValue.bind(this));
			
		}
		
		FBQuestion.getDefaultModel = getDefaultModel;
		FBQuestion.QuestionStateEnum = QuestionStateEnum;
		
		questionConstructors["FB"] = FBQuestion;
		
		return FBQuestion;
	})();
	
	/************************************************************************************
		End Class FBQuestion
	*/
	
	
	/************************************************************************************
		Class ListQuestion
	*/
	
	
	var ListQuestion = (function(){
			
		function getDefaultModel(enabled, state, selectedValue) {
			enabled = getDefault(enabled, true);
			state = getDefault(state, QuestionStateEnum.unsolved);
			selectedValue = getDefault(selectedValue, "");
			return {
				"enabled" : enabled,
				"state": state,
				"selectedValue" : selectedValue
			};
		}
		
		function ListQuestion(params){
		

			this.model = getDefaultModel();
			this.__explanation = getDefault(params["explanation"], "");
			this.__values = getDefault(params["values"], "");
			this.__answer = getDefault(params["answer"], "");
			
			this.rootDomElement = undefined;
			this.__input = undefined;
			
			this.__updateEnabled = function(){
				this.__input.prop('disabled', !this.model.enabled);
			};
			
			this.__updateState = function(){
				
			};
			
			this.__updateSelectedElement = function(){
				if(this.model.selectedValue != this.__input.find(":selected").text())
				{
					this.__input.val(this.model.selectedValue);
				}
				
			}
			;
			this.__initDomElement = function(){
				var root = $('<span class="yaq-FBQuestion"></span>');
				this.rootDomElement = root;
				
				var input= $('<select></select>');
				this.__input = input;
				input.append($('<option value=""></option>'));
				this.__values.split(",").forEach(function(elem){
					elem = elem.trim();
					input.append($('<option value="' + elem + '">' + elem + '</option>'));
				}
				);

				
				input.on('change', (function() {
					this.model.state = QuestionStateEnum.unsolved;
					this.model.selectedValue = this.__input.find(":selected").text();
				}).bind(this));
				
				root.append(input);
							
				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				
				this.model.state=QuestionStateEnum.unsolved;
				this.model.enabled=true;
				this.model.selectedValue="";
			};
			
			this.getModel = function(){return this.model;};
			
			this.getRootElement = function(){ return this.rootDomElement; };
			
			this.grade = function(){
				var gans = this.model.selectedValue;
			
				if(gans.trim() === ""){
					this.model.state = QuestionStateEnum.unsolved;
					blink(this.__input);// this.__input.effect("highlight", {}, 500)
				} else if(gans === this.__answer){
					this.model.state = QuestionStateEnum.correct | QuestionStateEnum.solved;
					this.model.enabled = false;
				} else {
					this.model.state = QuestionStateEnum.wrong;
				}
			
			};
			
			this.solve = function(){
				this.model.selectedValue = this.__answer;
				this.model.enabled = false;
				this.model.state = QuestionStateEnum.solved;
			};
			
			this.__initDomElement();

			watch(this.model, "state", this.__updateState.bind(this));
			watch(this.model, "enabled", this.__updateEnabled.bind(this));
			watch(this.model, "selectedValue", this.__updateSelectedElement.bind(this));
			
		}
		
		ListQuestion.getDefaultModel = getDefaultModel;
		ListQuestion.QuestionStateEnum = QuestionStateEnum;
		
		questionConstructors["SC"] = ListQuestion;
		
		return ListQuestion;
	})();
	
	/************************************************************************************
		End Class ListQuestion
	*/
	
	/************************************************************************************
		Class TFQuestion
	*/
	
	
	var TFQuestion = (function(){
		
		var TrueIndexSwitch3 = 0;
		var FalseIndexSwitch3 = 2;
		
		function getDefaultModel(enabled, state, answer, explanation) {
			enabled = getDefault(enabled, true);
			state = getDefault(state, QuestionStateEnum.unsolved);

			return {
				"enabled" : enabled,
				"state": state
			};
		}
		
		function TFQuestion(params){
			this.model = getDefaultModel();
			this.__explanation = getDefault(params["explanation"], "");
			this.__answer = getDefault(params["answer"], "");
			this.rootDomElement = undefined;
			this.__switch3 = undefined;
			
			this.__updateEnabled = function(){
				this.__switch3.getModel().enabled = this.model.enabled;
			};
			
			this.__updateState = function(){
		
			};
			
			this.__initDomElement = function(){
				var root = $('<span class="yaq-TFQuestion"></span>');
				this.rootDomElement = root;
				this.__switch3 = new Switch3();
				this.model.innerModel = this.__switch3.model;
				root.append(this.__switch3.getRootElement());
							
				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				this.__switch3.reset();
				this.model.enabled=true;
				this.model.state = QuestionStateEnum.unsolved;
			};
			
			this.getModel = function(){return this.model;};
			
			this.getRootElement = function(){ return this.rootDomElement; };
			
			this.grade = function(){
				
				var gans = this.__switch3.getModel().selectedIndex
				var cans = (this.__answer === "T") ? TrueIndexSwitch3 : FalseIndexSwitch3;
				if(gans === 1){
					this.model.state = QuestionStateEnum.unsolved;
					blink(this.__switch3.rootDomElement);
					//this.__switch3.getRootElement().effect("highlight", {}, 500);
				} else if(gans === cans){
					this.model.state = QuestionStateEnum.correct | QuestionStateEnum.solved;
					this.model.enabled = false;
				} else {
					this.model.state = QuestionStateEnum.wrong | QuestionStateEnum.solved;
					this.model.enabled = false;
				}

			};
			
			this.solve = function(){
				var cans = (this.__answer === "T") ? TrueIndexSwitch3 : FalseIndexSwitch3;
				this.model.selectedIndex = cans;
				this.model.state =  QuestionStateEnum.solved;
			};
			
			this.__initDomElement();

			watch(this.model, "state", this.__updateState.bind(this));
			watch(this.model, "enabled", this.__updateEnabled.bind(this));
			/*watch(this.__switch3.getModel(), ["selectedIndex"], (function(prop, action, newvalue, oldvalue){
				this.model.state = QuestionStateEnum.unsolved;
			}).bind(this));*/
			
		}
		
		TFQuestion.getDefaultModel = getDefaultModel;
		TFQuestion.QuestionStateEnum = QuestionStateEnum;
		
		questionConstructors["TF"] = TFQuestion;
		
		return TFQuestion;
	})();
	
	/************************************************************************************
		End Class TFQuestion
	*/
	
	
	
	/************************************************************************************
		Class QuestionContainer
	*/
	
	
	var QuestionContainer = (function(){
		

		
		function getDefaultModel(enabled,state) {
			enabled = getDefault(enabled, true);
			state = getDefault(state,QuestionStateEnum.unsolved);
			return {
				"enabled" : enabled,
				"state": state
			};
		}
		
		function QuestionContainer(innerQuestionParams,rootElement){
		
			this.model = getDefaultModel();
			this.rootDomElement = rootElement;

			this.__uid=Math.random();
			this.__innerQuestion = undefined;
			this.__wrongMarker = undefined;
			this.__correctMarker = undefined;
			this.__infoMarker = undefined;
			
			this.__updateEnabled = function(){
				this.__innerQuestion.getModel().enabled = this.model.enabled;
			};
			
			this.__updateState = function(){
				this.model.state = this.__innerQuestion.getModel().state;
				if(this.model.state == QuestionStateEnum.unsolved){
					this.__wrongMarker.addClass('yaq-hidden');
					this.__correctMarker.addClass('yaq-hidden');
					this.__infoMarker.addClass('yaq-hidden');
				} else if (this.model.state & QuestionStateEnum.correct){
					this.__wrongMarker.addClass('yaq-hidden');
					this.__correctMarker.removeClass('yaq-hidden');
					this.__infoMarker.addClass('yaq-hidden');
				}else if (this.model.state & QuestionStateEnum.wrong){
					this.__wrongMarker.removeClass('yaq-hidden');
					this.__correctMarker.addClass('yaq-hidden');
					this.__infoMarker.addClass('yaq-hidden');
				} else if (this.model.state &  QuestionStateEnum.solved){
					this.__wrongMarker.addClass('yaq-hidden');
					this.__correctMarker.addClass('yaq-hidden');
					this.__infoMarker.removeClass('yaq-hidden');
				}
			};
			
			this.__initDomElement = function(innerQuestionParams){
				var root ;
				if(!this.rootDomElement)
				{
					root = $('<span class="yaq-Question"></span>');
					this.rootDomElement = root;
				} else{
					root = this.rootDomElement;
					root.removeClass("yaq-q");
					root.addClass("yaq-Question");
				}
				
				
					

				this.__innerQuestion = new questionConstructors[innerQuestionParams.type](innerQuestionParams);
				this.model.innerModel = this.__innerQuestion.getModel();
				root.append(this.__innerQuestion.getRootElement());
				watch(this.__innerQuestion.getModel(), "state", this.__updateState.bind(this));
					
				this.__wrongMarker = $("<i class='fa fa-thumbs-down yaq-hidden' style='color:red; margin-right:10px;margin-left:10px;' data-role='wrongMarker'></i>");
				this.__correctMarker = $("<i class='fa fa-thumbs-up yaq-hidden' style='color:green; margin-right:10px;margin-left:10px;' data-role='correctMarker'></i>");
				this.__infoMarker = $("<i class='fa fa-info-circle yaq-hidden' style='color:blue; margin-right:10px;margin-left:10px;'  data-role='solutionMarker'></i>");	
				root.append(this.__wrongMarker);
				root.append(this.__correctMarker);
				root.append(this.__infoMarker);	
					
				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				this.__innerQuestion.reset();
				this.model.enabled=true;
			};
			
			this.getModel = function(){return this.model;};
			
			this.getRootElement = function(){ return this.rootDomElement; };
			
			this.grade = function(){
				this.__innerQuestion.grade();
			};
			
			this.solve = function(){
				this.__innerQuestion.solve();
			};
		
			this.__initDomElement(innerQuestionParams);

			watch(this.model, "enabled", this.__updateEnabled.bind(this));
		
			
		}
		
		QuestionContainer.getDefaultModel = getDefaultModel;
		QuestionContainer.QuestionStateEnum = QuestionStateEnum;
		
		return QuestionContainer;
	})();
	
	/************************************************************************************
		End Class QuestionContainer
	*/
	
	
	
	/************************************************************************************
		Class TFQuizActivity
	*/
	
	var QuizActivity = (function(){
	
		function __b64DecodeUnicode(str) {
			// Going backwards: from bytestream, to percent-encoding, to original string.
			return decodeURIComponent(atob(str).split('').map(function(c) {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			}).join(''));
		}

		function getDefaultModel(enabled, state) {
				enabled = getDefault(enabled, true);
				state = getDefault(state, ActivityStateEnum.ongoing);
				return {
					"enabled" : enabled,
					"state" : state,
				};
			}

		function QuizActivity(innerHTML){
			this.model = getDefaultModel();
			this.rootDomElement = undefined;
			this.__questions = [];
				
			
			this.__updateEnabled = function()
			{
				this.__questions.forEach((function(elem){
					elem.getModel().enabled = this.model.enabled;
				}).bind(this));
			};
			
			this.__updateState = function(){
				
				var allSolved = true;
				var allCorrect = true;
				var anyUnsolved = false;
				
				var allCorrectOrSolved = true;
				
				this.__questions.forEach(function(elem){
					var state = elem.getModel().state;
					if(!(state & QuestionStateEnum.solved))
						allSolved = false;
					if(state & QuestionStateEnum.unsolved)
						anyUnsolved = true;
					if(!(state & QuestionStateEnum.correct))
						allCorrect = false;
					if(!(state & QuestionStateEnum.correct) && !(state & QuestionStateEnum.solved))
						allCorrectOrSolved = false;
					
				});
				
				this.model.state = 0;
				if(!allCorrectOrSolved)
				{
					this.model.state = ActivityStateEnum.ongoing;
				} else {
					this.model.state = ActivityStateEnum.ended;
				}
				
				if(!allCorrect && !anyUnsolved)
				{
					this.model.state = this.model.state | ActivityStateEnum.solvable;
				}
			};
					
			
			this.grade = function(){
				this.__questions.forEach(function(elem){
					elem.grade();
				});
			};
			
			this.getNumberOfQuestions =  function(){
				return this.__questions.length;
			}
			
			this.solve = function(){
				this.__questions.forEach(function(elem)
				{
					if(!(elem.getModel().state & QuestionStateEnum.solved) && (elem.getModel().state & QuestionStateEnum.wrong))
					{
						elem.solve();
					}
				});
			};
			
			this.reset = function(){
				this.__questions.forEach(function(elem){
					elem.reset();
				});
				this.model.enabled=true;
			};
			
			this.__initDomElement = function(innerHTML){
				var root = $('<div class="yaq-activity"></div>');
				this.rootDomElement = root;
				root.html(innerHTML);
				root.find('.yaq-q').each((function(index,elem){
					elem = $(elem);
					var textmodel = __b64DecodeUnicode(elem.attr('data-model'));
					var model = JSON.parse(textmodel);
					var question = new QuestionContainer(model, elem);
					this.__questions.push(question);
					this.model['innerModel' + index] = question.getModel();
					//elem.replaceWith(question.getRootElement());
					watch(question.getModel(),["state"], (this.__updateState).bind(this));
				}).bind(this));
				
				
				this.__updateEnabled();
			};
			
	
			
			this.__initDomElement(innerHTML);
			

			watch(this.model, "enabled", this.__updateEnabled.bind(this));
			
			this.getModel = function(){return this.model;};
			this.getRootElement = function(){return this.rootDomElement;};
			
		}
		
		QuizActivity.getDefaultModel = getDefaultModel;
		QuizActivity.StateEnum = ActivityStateEnum;
		
		return QuizActivity;
	})();
	
	
	/************************************************************************************
		End Class QuizActivity
	*/
	
	
	/************************************************************************************
		Class Quiz
	*/
	
	var Quiz = (function(){
	

	
		function getDefaultModel(exerciceNumber, enabled, state, title) {
				enabled = getDefault(enabled, true);
				state = getDefault(state, ActivityStateEnum.ongoing);
				return {
					"enabled" : enabled,
					"state" : state
				};
			}

		function Quiz(innerHTML,params){

			
			var saveEnabled = true;
			this.model = getDefaultModel();
			this.timestamp = 0;
			this.__exerciceNumber = getDefault(params['exerciceNumber'], 0);
			this.__title = getDefault(params['title'], "");
			this.__uid = params['uid'];
			if(!this.__uid)
				throw "Missing or invalid uid field in YAQ quiz model " + this.__uid;
			if(quizz[this.__uid])
				throw "YAQ quiz uid is already used " + this.__uid;
			//quizz[this.__uid] = this;
			this.rootDomElement = undefined;
			this.__activity;
			this.__buttonGrade = undefined;
			this.__buttonReset = undefined;
			this.__buttonSolve = undefined;

			this.__updateEnabled = function()
			{
				if(this.model.enabled)
				{
					this.__buttonGrade.addClass("yaq-interractiveElement");
					this.__buttonReset.addClass("yaq-interractiveElement");
					this.__buttonSolve.addClass("yaq-interractiveElement");
				} else {
					this.__buttonGrade.removeClass("yaq-interractiveElement");
					this.__buttonReset.removeClass("yaq-interractiveElement");
					this.__buttonSolve.removeClass("yaq-interractiveElement");
				}
				
				this.__activity.getModel().enabled = this.model.enabled;
			};
					
			this.__updateState = function()
			{
				var flagEnd=false;
				if(this.model.state & ActivityStateEnum.ended)
				{
					flagEnd = true;
					this.__buttonReset.show();
				}else{
					this.__buttonReset.hide();
				}
				
				if(!flagEnd && this.model.state & ActivityStateEnum.ongoing)
				{
					this.__buttonGrade.show();
				}else{
					this.__buttonGrade.hide();
				}
				
				if(!flagEnd && this.model.state & ActivityStateEnum.solvable)
				{
					this.__buttonSolve.show();
				}else{
					this.__buttonSolve.hide();
				}	
			};
			
			this.grade = function(){
				this.__activity.grade();
			};
			
			this.solve = function(){
				this.__activity.solve();
			};
			
			this.reset = function(){
				this.__activity.reset();
				this.model.enabled=true;
			};
			
			this.__initEvent = function(){
				this.__buttonGrade.click(this.grade.bind(this));
				this.__buttonSolve.click(this.solve.bind(this));
				this.__buttonReset.click(this.reset.bind(this));
			};
			
			this.__updateModel = function(){
				this.timestamp = + new Date();
				if(saveEnabled)
				{
					self.persistenceWidget.save(this.__uid,this.model);
				}
			};
				
				
			this.setModel = function(model)
			{
				saveEnabled=false;
				$.extend(true,this.model,model);
				setTimeout((function(){saveEnabled=true;}).bind(this));// deferred after model callback are called
			}
			
			
			
			this.__initDomElement = function(innerHTML){
				
				var root = $("<div class='yaq-root'></div>");
				this.rootDomElement = root;
				root.append("<div class='yaq-head'>Exercice " + (this.__exerciceNumber + 1) + " : " + this.__title  + "</div>");
				
				var mainContent = $("<div class='yaq-main-content'></div>");
				root.append(mainContent);
				
				this.__activity = new QuizActivity(innerHTML);
				this.model.innerModel = this.__activity.getModel();
				mainContent.append(this.__activity.getRootElement());
				watch(this.__activity.getModel(), ["state"], (function(){
					this.model.state = this.__activity.getModel().state;
				}).bind(this));
				
				
				var footer=$('<div class="yaq-footer"></div>');
				
				if(this.__activity.getNumberOfQuestions()===0)
					footer.addClass("yaq-hidden");
				
				this.__buttonGrade = $('<span class="yaq-button">' + texts["gradeButtonText"] + '</span>');
				footer.append(this.__buttonGrade);
				this.__buttonSolve = $('<span class="yaq-button">' + texts["solveButtonText"] + '</span>');
				footer.append(this.__buttonSolve);
				this.__buttonReset = $('<span class="yaq-button">' + texts["resetButtonText"] + '</span>');
				footer.append(this.__buttonReset);
				
				
				
				root.append(footer);
				
				this.__updateEnabled();
				this.__updateState();
				this.__initEvent();
			};
			
			this.__initDomElement(innerHTML);
			
			watch(this.model, "state", this.__updateState.bind(this));
			watch(this.model, "enabled", this.__updateEnabled.bind(this));
			
			watch(this.model,this.__updateModel.bind(this));

			
			
			this.getModel = (function(){return this.model;}).bind(this);
			this.getRootElement = (function(){return this.rootDomElement;}).bind(this);
			
		}
		
		Quiz.getDefaultModel = getDefaultModel;
		Quiz.StateEnum = ActivityStateEnum;
		
		return Quiz;
	})();
	/************************************************************************************
		End Class Quiz
	*/
	
	/******************************
		Text similarity helper
	*/
	
	var Latinise={};Latinise.latin_map={"Á":"A",
"Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A",
"Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B",
"Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E",
"Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E",
"Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H",
"Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I",
"Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L",
"Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N",
"Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O",
"Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI",
"Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R",
"Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T",
"Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U",
"Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W",
"Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z",
"Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L",
"ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a",
"ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a",
"å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b",
"ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d",
"ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e",
"ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g",
"ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i",
"ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j",
"ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l",
"ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n",
"ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o",
"ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o",
"õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q",
"ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s",
"ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t",
"ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m",
"ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u",
"ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v",
"ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y",
"ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z",
"ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x"};
	function latinise(s){return s.replace(/[^A-Za-z0-9\[\] ]/g,function(a){return Latinise.latin_map[a]||a})};
	var latinize = latinise;
	

	function allTrim(s){
			return s.replace(/\s+/g,' ')
					   .replace(/^\s+|\s+$/,'');
		 };

	function quasiEqualString(s1,s2, tolerance){
		tolerance = tolerance || 0.8;
		function editDistance(s1, s2) {
		  s1 = s1.toLowerCase();
		  s2 = s2.toLowerCase();

		  var costs = new Array();
		  for (var i = 0; i <= s1.length; i++) {
			var lastValue = i;
			for (var j = 0; j <= s2.length; j++) {
			  if (i == 0)
				costs[j] = j;
			  else {
				if (j > 0) {
				  var newValue = costs[j - 1];
				  if (s1.charAt(i - 1) != s2.charAt(j - 1))
					newValue = Math.min(Math.min(newValue, lastValue),
					  costs[j]) + 1;
				  costs[j - 1] = lastValue;
				  lastValue = newValue;
				}
			  }
			}
			if (i > 0)
			  costs[s2.length] = lastValue;
		  }
		  return costs[s2.length];
		}
	
		function similarity(s1, s2) {
		  var longer = s1;
		  var shorter = s2;
		  if (s1.length < s2.length) {
			longer = s2;
			shorter = s1;
		  }
		  var longerLength = longer.length;
		  if (longerLength == 0) {
			return 1.0;
		  }
		  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
		}
	
		s1 = latinise(allTrim(s1));
		s2 = latinise(allTrim(s2));
	
		return similarity(s1,s2)>0.8;
	}
	
	/*
		End Text similarity helper
	*******************************/
	

	function initFromObj(jqElement, index, innerHTML, model)
	{
		model.exerciceNumber = index;
		var quiz = new Quiz(innerHTML, model);
		quizz.push(quiz);
		//self.persistenceWidget.load(quiz.__uid,(quiz.setModel).bind(quiz));
		//setTimeout((function(jqElement,quiz){ // deferred display after model loading (perhaps)
			jqElement.append(quiz.getRootElement());
		//	}).bind(this,jqElement,quiz));	
		
	}
	
	var initialized=false;
	
	self.reloadAll = function(){
		for(var i=0; i<quizz.length;i++)
		{
			var quiz = quizz[i];
			self.persistenceWidget.load(quiz.__uid,(quiz.setModel).bind(quiz));
		}
	}

	self.SyncAll = function(){
		for(var i=0; i<quizz.length;i++)
		{
			var quiz = quizz[i];
			self.persistenceWidget.sync(quiz.__uid,quiz.timestamp,quiz.model,(quiz.setModel).bind(quiz));
		}
		
	}
	
	self.persistenceWidget = undefined;
	
    self.init = function(){
		if(initialized)
		{
			throw "Yaq init method cannot be called twice !"
		}
		initialized=true;	
		self.persistenceWidget = new PersistenceWidget();
        $(".yaq").each(function(index){
			e = $(this);
			innerHTML = e.html();
			var model = e.attr('data-model');
			try {
				if(model)
				{
					model = JSON.parse(model);
					e.empty();
					initFromObj(e, index, innerHTML, model);
				}
				else throw "Empty model in YAQ quiz";
				
			}
			catch (e) {
			   console.log(e);
			   console.log("YAQ: Error while parsing quiz.");
			   console.log("Inner content is: " + innerHTML);
			   if(model)
				   console.log('Top model: ' + model);
			}
			
		}).show();
		$(window).on( "unload",(function() {
			self.persistenceWidget.flushSave(true);
			}).bind(this));
    };

	
	
    return self;
})();

document.addEventListener("DOMContentLoaded", function() {
    yaq_app.init();
	// Remove single letter units from maths.js... hugly hack
	for(var i=0; i < 26; i++){
		var letter = String.fromCharCode(97 + i);
		var letterCap = String.fromCharCode(65 + i);

		delete math.Unit.UNITS[letter];
		delete math.Unit.UNITS[letterCap];
	}
});
