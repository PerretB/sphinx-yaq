import { MathVariableError, testAnswer } from "./grading.js";
import {
    ActivityState as ActivityStateEnum,
    QuestionState as QuestionStateEnum,
    answerChanged,
    calculateActivityState,
    gradeAnswer,
    resetAnswer,
    revealAnswer,
} from "./model.js";
import { fingerprintQuizDefinition, QuizStorage } from "./storage.js";

var yaq_app= (function(){
    var self = {};

	var options = {
		"base64Encode" : false
	};
	
	var quizz = [];
	var quizIdentifiers = new Set();
	
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
	
	var questionConstructors = {};
	
	function arrayClear(array)
	{
		array.splice(0,array.length);
	}

	function isQuestionState(value) {
		return value === QuestionStateEnum.unsolved ||
			value === QuestionStateEnum.correct ||
			value === QuestionStateEnum.wrong ||
			value === QuestionStateEnum.solved;
	}

	
	
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
		
		function Switch3(_model, onChange){
			this.model = getDefaultModelSwitch3();
			this.__onChange = onChange || function() {};
			this.rootDomElement = undefined;
			this.__buttons = undefined;
			this.__values = [texts["True"], texts["dontKnow"], texts["False"]];
			
			this.__updateSelection= function(){
				var extraStyles = this.model.selectedExtraStyles.join(" ")
				var buttons = this.__buttons;
				buttons.removeClass(extraStyles + " yaq-switch3-button-active yaq-switch3-button-notActive");
				var model = this.model;
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
				arrayClear(this.model.selectedExtraStyles);
				this.__buttons.removeClass("yaq-switch3-button-disabled");
				if(this.model.enabled)
				{
					this.__buttons.addClass("yaq-interractiveElement");
				} else {
					this.model.selectedExtraStyles.push("yaq-switch3-button-disabled");
					this.__buttons.removeClass("yaq-interractiveElement");
				}
			}
		
			this.reset = function(){
				this.model.enabled=true;
				arrayClear(this.model.selectedExtraStyles);
				this.model.selectedIndex = 1;
				this.render();
			};

			this.setEnabled = function(enabled){
				this.model.enabled = enabled;
				this.render();
			};

			this.setSelectedIndex = function(index){
				this.model.selectedIndex = index;
				this.render();
			};

			this.render = function(){
				this.__updateEnabled();
				this.__updateSelection();
			};
		
			this.__initEvents = function(){
				
				this.__buttons.click((function(e){
					if(this.model.enabled)
					{
						var newIndex = + $(e.target).attr("data-index");
						if(newIndex !== this.model.selectedIndex) {
							this.model.selectedIndex = newIndex;
							this.render();
							this.__onChange();
						}
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
		
		function FBQuestion(params, onChange){
		
			
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
			this.__onChange = onChange || function() {};
			
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

			this.render = function(){
				this.__updateEnabled();
				this.__updateValue();
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
					this.model.value = this.__input.val();
					this.model = answerChanged(this.model);
					this.__warningMarker.addClass('yaq-hidden');
					this.render();
					this.__onChange();
				}).bind(this));
				
				root.append(input);

				this.__warningMarker = $("<span class='yaq-hidden' style='font-size:150%;cursor:help;color:orange; margin-right:10px;margin-left:10px;' data-role='warningMarker' title='This is my tooltip'>⚠</span>");
				root.append(this.__warningMarker);

				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				this.model = resetAnswer({ ...this.model, value: "" });
				this.__warningMarker.addClass('yaq-hidden');
				this.render();
				this.__onChange();
			};
			
				this.getModel = function(){return this.model;};
				this.getPersistenceState = function(){
					return { type: "FB", enabled: this.model.enabled, state: this.model.state, value: this.model.value };
				};
				this.restore = function(state){
					if(!state || state.type !== "FB" || typeof state.enabled !== "boolean" ||
						!isQuestionState(state.state) || typeof state.value !== "string") return false;
					this.model = { enabled: state.enabled, state: state.state, value: state.value };
					this.render();
					return true;
				};
				
				this.getRootElement = function(){ return this.rootDomElement; };

			this.grade = function(){
				var q=this.__input;
				
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
						if(testAnswer(ans, gans, {
							sequence: sequence,
							fuzzy: fuzzy,
							noSpace: nospace,
							math: mathEq,
							mathVariables: this.__math_vars,
							mathTries: this.__math_tries,
							regex: regex,
							ordered: ordered,
							fuzzyEqual: quasiEqualString,
							compileMath: math.compile.bind(math),
							random: Math.random,
							onCorrectAnswerSyntaxError: function(correctAnswer) {
								window.alert("Failed to parse correct answer, contact website creator: " + correctAnswer);
							},
						}))
						{
							this.model = gradeAnswer(this.model, { answered: true, correct: true });
						}else{
							this.model = gradeAnswer(this.model, { answered: true, correct: false });
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
					this.model = gradeAnswer(this.model, { answered: false, correct: false });
					blink(q);
				}
				this.render();
				this.__onChange();

			};
			
			this.solve = function(){
				this.model = revealAnswer({ ...this.model, value: this.__displayedAnswer });
				this.render();
				this.__onChange();
			};
			
			this.__initDomElement();

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
		
		function ListQuestion(params, onChange){
		

			this.model = getDefaultModel();
			this.__explanation = getDefault(params["explanation"], "");
			this.__values = getDefault(params["values"], "");
			this.__answer = getDefault(params["answer"], "");
			
			this.rootDomElement = undefined;
			this.__input = undefined;
			this.__onChange = onChange || function() {};
			
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

			this.render = function(){
				this.__updateEnabled();
				this.__updateSelectedElement();
			};
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
					this.model.selectedValue = this.__input.find(":selected").text();
					this.model = answerChanged(this.model);
					this.render();
					this.__onChange();
				}).bind(this));
				
				root.append(input);
							
				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				
				this.model = resetAnswer({ ...this.model, selectedValue: "" });
				this.render();
				this.__onChange();
			};
			
				this.getModel = function(){return this.model;};
				this.getPersistenceState = function(){
					return { type: "SC", enabled: this.model.enabled, state: this.model.state, selectedValue: this.model.selectedValue };
				};
				this.restore = function(state){
					if(!state || state.type !== "SC" || typeof state.enabled !== "boolean" ||
						!isQuestionState(state.state) || typeof state.selectedValue !== "string") return false;
					this.model = { enabled: state.enabled, state: state.state, selectedValue: state.selectedValue };
					this.render();
					return true;
				};
				
				this.getRootElement = function(){ return this.rootDomElement; };
			
			this.grade = function(){
				var gans = this.model.selectedValue;
			
				if(gans.trim() === ""){
					this.model = gradeAnswer(this.model, { answered: false, correct: false });
					blink(this.__input);// this.__input.effect("highlight", {}, 500)
				} else if(gans === this.__answer){
					this.model = gradeAnswer(this.model, { answered: true, correct: true });
				} else {
					this.model = gradeAnswer(this.model, { answered: true, correct: false });
				}
				this.render();
				this.__onChange();
			
			};
			
			this.solve = function(){
				this.model = revealAnswer({ ...this.model, selectedValue: this.__answer });
				this.render();
				this.__onChange();
			};
			
			this.__initDomElement();

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
		
		function TFQuestion(params, onChange){
			this.model = getDefaultModel();
			this.__explanation = getDefault(params["explanation"], "");
			this.__answer = getDefault(params["answer"], "");
			this.rootDomElement = undefined;
			this.__switch3 = undefined;
			this.__onChange = onChange || function() {};
			
			this.__updateEnabled = function(){
				this.__switch3.setEnabled(this.model.enabled);
			};

			this.render = function(){
				this.__updateEnabled();
			};
			
			this.__updateState = function(){
		
			};
			
			this.__initDomElement = function(){
				var root = $('<span class="yaq-TFQuestion"></span>');
				this.rootDomElement = root;
				this.__switch3 = new Switch3(undefined, (function(){
					this.model = answerChanged(this.model);
					this.__onChange();
				}).bind(this));
				this.model.innerModel = this.__switch3.model;
				root.append(this.__switch3.getRootElement());
							
				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				this.__switch3.reset();
				this.model = resetAnswer(this.model);
				this.render();
				this.__onChange();
			};
			
				this.getModel = function(){return this.model;};
				this.getPersistenceState = function(){
					return {
						type: "TF",
						enabled: this.model.enabled,
						state: this.model.state,
						selectedIndex: this.__switch3.getModel().selectedIndex
					};
				};
				this.restore = function(state){
					if(!state || state.type !== "TF" || typeof state.enabled !== "boolean" ||
						!isQuestionState(state.state) || ![0, 1, 2].includes(state.selectedIndex)) return false;
					this.model = { enabled: state.enabled, state: state.state };
					this.__switch3.setSelectedIndex(state.selectedIndex);
					this.render();
					return true;
				};
				
				this.getRootElement = function(){ return this.rootDomElement; };
			
			this.grade = function(){
				
				var gans = this.__switch3.getModel().selectedIndex
				var cans = (this.__answer === "T") ? TrueIndexSwitch3 : FalseIndexSwitch3;
				if(gans === 1){
					this.model = gradeAnswer(this.model, { answered: false, correct: false });
					blink(this.__switch3.rootDomElement);
					//this.__switch3.getRootElement().effect("highlight", {}, 500);
				} else if(gans === cans){
					this.model = gradeAnswer(this.model, { answered: true, correct: true });
				} else {
					this.model = gradeAnswer(this.model, { answered: true, correct: false });
				}
				this.render();
				this.__onChange();

			};
			
			this.solve = function(){
				var cans = (this.__answer === "T") ? TrueIndexSwitch3 : FalseIndexSwitch3;
				this.__switch3.setSelectedIndex(cans);
				this.model = revealAnswer(this.model);
				this.render();
				this.__onChange();
			};
			
			this.__initDomElement();

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
		
		function QuestionContainer(innerQuestionParams,rootElement,onChange){
		
			this.model = getDefaultModel();
			this.rootDomElement = rootElement;

			this.__uid=Math.random();
			this.__innerQuestion = undefined;
			this.__wrongMarker = undefined;
			this.__correctMarker = undefined;
			this.__infoMarker = undefined;
			this.__onChange = onChange || function() {};
			
			this.__updateEnabled = function(){
				this.__innerQuestion.getModel().enabled = this.model.enabled;
				this.__innerQuestion.render();
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

			this.__innerChanged = function(){
				this.model.innerModel = this.__innerQuestion.getModel();
				this.__updateState();
				this.__onChange();
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
				
				
					

				var QuestionConstructor = questionConstructors[innerQuestionParams.type];
				if(!QuestionConstructor)
					throw new Error("Unsupported YAQ question type: " + innerQuestionParams.type);
				this.__innerQuestion = new QuestionConstructor(innerQuestionParams, this.__innerChanged.bind(this));
				this.model.innerModel = this.__innerQuestion.getModel();
				root.append(this.__innerQuestion.getRootElement());
					
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
				this.__updateState();
			};
			
				this.getModel = function(){return this.model;};
				this.getPersistenceState = function(){ return this.__innerQuestion.getPersistenceState(); };
				this.restore = function(state){
					if(!this.__innerQuestion.restore(state)) return false;
					this.model.innerModel = this.__innerQuestion.getModel();
					this.model.enabled = this.model.innerModel.enabled;
					this.__updateState();
					return true;
				};
				
				this.getRootElement = function(){ return this.rootDomElement; };

			this.setEnabled = function(enabled){
				this.model.enabled = enabled;
				this.__updateEnabled();
			};
			
			this.grade = function(){
				this.__innerQuestion.grade();
			};
			
			this.solve = function(){
				this.__innerQuestion.solve();
			};
		
			this.__initDomElement(innerQuestionParams);

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

		function QuizActivity(innerHTML, onChange){
			this.model = getDefaultModel();
			this.rootDomElement = undefined;
			this.__questions = [];
			this.__onChange = onChange || function() {};
				
			
			this.__updateEnabled = function()
			{
				this.__questions.forEach((function(elem){
					elem.setEnabled(this.model.enabled);
				}).bind(this));
			};
			
			this.__updateState = function(){
				this.model.state = calculateActivityState(this.__questions.map(function(elem){
					return elem.getModel().state;
				}));
			};

			this.__questionChanged = function(){
				this.__updateState();
				this.__onChange();
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
					try {
						var textmodel = __b64DecodeUnicode(elem.attr('data-model'));
						var model = JSON.parse(textmodel);
						var question = new QuestionContainer(model, elem, this.__questionChanged.bind(this));
						this.__questions.push(question);
						this.model['innerModel' + index] = question.getModel();
					} catch (error) {
						console.error("YAQ: Error while initializing question.", error);
						elem.removeClass("yaq-q yaq-Question").addClass("yaq-question-fallback");
						elem.append($("<span></span>").text(" Interactive question unavailable."));
					}
				}).bind(this));
				
				this.__updateState();
				this.__updateEnabled();
			};
			
	
			
			this.__initDomElement(innerHTML);
			

				this.getModel = function(){return this.model;};
				this.getRootElement = function(){return this.rootDomElement;};
				this.getPersistenceState = function(){
					return {
						questions: this.__questions.map(function(question){ return question.getPersistenceState(); })
					};
				};
				this.restore = function(state){
					if(!state || !Array.isArray(state.questions) ||
						state.questions.length !== this.__questions.length) return false;
					for(var index = 0; index < this.__questions.length; index++) {
						if(!this.__questions[index].restore(state.questions[index])) return false;
					}
					this.__updateState();
					return true;
				};
				this.setEnabled = function(enabled){
				this.model.enabled = enabled;
				this.__updateEnabled();
			};
			
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

		function Quiz(innerHTML,params,fingerprint){

			
			this.model = getDefaultModel();
			this.__fingerprint = fingerprint;
			this.__exerciceNumber = getDefault(params['exerciceNumber'], 0);
			this.__title = getDefault(params['title'], "");
			this.__uid = params['uid'];
			if(!this.__uid)
				throw "Missing or invalid uid field in YAQ quiz model " + this.__uid;
			if(quizIdentifiers.has(this.__uid))
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
				
				this.__activity.setEnabled(this.model.enabled);
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

			this.__activityChanged = function(){
				this.model.innerModel = this.__activity.getModel();
				this.model.state = this.__activity.getModel().state;
				this.__updateState();
				this.__updateModel();
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
				this.__updateEnabled();
				self.storage.remove(this.__uid);
			};
			
			this.__initEvent = function(){
				this.__buttonGrade.click(this.grade.bind(this));
				this.__buttonSolve.click(this.solve.bind(this));
				this.__buttonReset.click(this.reset.bind(this));
			};
			
			this.__updateModel = function(){
				self.storage.save(this.__uid, this.__fingerprint, this.getPersistenceState());
			};

			this.getPersistenceState = function(){
				return { activity: this.__activity.getPersistenceState() };
			};

			this.restore = function(state){
				if(!state || !this.__activity.restore(state.activity)) return false;
				this.model.innerModel = this.__activity.getModel();
				this.model.state = this.model.innerModel.state;
				this.__updateState();
				return true;
			};
			
			
			
			this.__initDomElement = function(innerHTML){
				
				var root = $("<div class='yaq-root'></div>");
				this.rootDomElement = root;
				root.append("<div class='yaq-head'>Exercice " + (this.__exerciceNumber + 1) + " : " + this.__title  + "</div>");
				
				var mainContent = $("<div class='yaq-main-content'></div>");
				root.append(mainContent);
				
				this.__activity = new QuizActivity(innerHTML, this.__activityChanged.bind(this));
				this.model.innerModel = this.__activity.getModel();
				mainContent.append(this.__activity.getRootElement());
				this.model.state = this.__activity.getModel().state;
				
				
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
		var definitions = jqElement.find(".yaq-q").map(function(_index, element){
			return $(element).attr("data-model");
		}).get();
		var fingerprint = fingerprintQuizDefinition(definitions);
		var quiz = new Quiz(innerHTML, model, fingerprint);
		var storedState = self.storage.load(quiz.__uid, fingerprint);
		if(storedState && !quiz.restore(storedState)) self.storage.remove(quiz.__uid);
		quizz.push(quiz);
		quizIdentifiers.add(quiz.__uid);
		jqElement.empty().append(quiz.getRootElement());
		
	}
	
	var initialized=false;
	self.storage = undefined;
	self.clearStoredProgress = function(){ return self.storage ? self.storage.clearAll() : false; };
	
    self.init = function(){
		if(initialized)
		{
			throw "Yaq init method cannot be called twice !"
		}
		initialized=true;	
		self.storage = new QuizStorage({ globalObject: window });
        $(".yaq").each(function(index){
			var element = $(this);
			var innerHTML = element.html();
			var model = element.attr('data-model');
			try {
				if(model)
				{
					model = JSON.parse(model);
					initFromObj(element, index, innerHTML, model);
				}
				else throw new Error("Empty model in YAQ quiz");
				
			}
			catch (error) {
			   console.error("YAQ: Error while initializing quiz.", error);
			   element.addClass("yaq-quiz-fallback");
			   element.append($("<p></p>").text("Interactive quiz unavailable."));
			}
			
		}).show();
		$(window).on( "unload",(function() {
			self.storage.flush();
			}).bind(this));
    };

	
	
    return self;
})();

globalThis.yaq_app = yaq_app;

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
