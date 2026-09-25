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
		elem.classList.remove("yaq-blink");
		void elem.offsetWidth;
		elem.classList.add("yaq-blink");
	}

	function createElement(tag, className, text) {
		const element = document.createElement(tag);
		if (className) element.className = className;
		if (text !== undefined) element.textContent = text;
		return element;
	}

	function createFeedbackMarker(className, role, symbol, label) {
		const marker = createElement("span", "yaq-marker yaq-hidden " + className);
		marker.dataset.role = role;
		marker.title = label;
		const icon = createElement("span", null, symbol);
		icon.setAttribute("aria-hidden", "true");
		marker.append(icon, createElement("span", "yaq-feedback-text", " " + label));
		return marker;
	}

	function questionContext(element, index) {
		const surrounding = element.parentElement?.cloneNode(true);
		surrounding?.querySelectorAll(".yaq-q, .yaq-spoiler-inline-hidden").forEach(node => node.remove());
		const prose = surrounding?.textContent?.replace(/\s+/g, " ").trim() || "";
		return "Question " + (index + 1) + (prose ? ": " + prose : "");
	}

	function setVisible(element, visible) {
		element.style.display = visible ? "" : "none";
	}
	
	var questionConstructors = {};
	
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
			};
		}
		
		function Switch3(_model, onChange){
			this.model = getDefaultModelSwitch3();
			this.__onChange = onChange || function() {};
			this.rootDomElement = undefined;
			this.__buttons = undefined;
			this.__values = [texts["True"], texts["dontKnow"], texts["False"]];
			
			this.__updateSelection= function(){
				this.__buttons.forEach((button, index) => {
					const selected = index === this.model.selectedIndex;
					button.classList.toggle("yaq-switch3-button-active", selected);
					button.classList.toggle("yaq-switch3-button-notActive", !selected);
					button.classList.toggle("yaq-switch3-button-disabled", selected && !this.model.enabled);
					button.setAttribute("aria-pressed", String(selected));
				});
			}
			
			
			this.__updateEnabled = function(){
				this.__buttons.forEach(button => {
					button.disabled = !this.model.enabled;
					button.classList.toggle("yaq-interractiveElement", this.model.enabled);
				});
			}
		
			this.reset = function(){
				this.model.enabled=true;
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
				
				this.__buttons.forEach(button => button.addEventListener("click", (e) => {
					if(this.model.enabled)
					{
						var newIndex = Number(e.currentTarget.dataset.index);
						if(newIndex !== this.model.selectedIndex) {
							this.model.selectedIndex = newIndex;
							this.render();
							this.__onChange();
						}
					}
				}));
			}
			
			this.__initDomElement = function(){
				var root = createElement("div", "yaq-switch3");
				this.rootDomElement = root;
				
				var container = createElement("div", "yaq-switch3-buttons");
				
				for(var i=0; i<3; i++)
				{
					var button = createElement("button", "yaq-switch3-button", this.__values[i]);
					button.type = "button";
					button.dataset.index = String(i);
					container.append(button);
				}
				
				this.__buttons = Array.from(container.children);
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
				this.__input.disabled = !this.model.enabled;
			};
			
			this.__updateState = function(){
				this.__warningMarker.classList.add('yaq-hidden');
			};
			
			this.__updateValue = function(){
				 
				 if(this.__input.value!==this.model.value){
					this.__input.value = this.model.value;
				 }
					
			};

			this.render = function(){
				this.__updateEnabled();
				this.__updateValue();
			};
			
			this.__initDomElement = function(){
				var root = createElement("span", "yaq-FBQuestion");
				this.rootDomElement = root;
				
				var input = createElement("input");
				input.type = "text";
				this.__input = input;
				
				if(this.__size !== 0)
				{
					input.size = this.__size;
				}
				else if(!this.__answser)
				{
					var l = this.__answer.length;
						input.size = Math.max(30,l+Math.round(l*0.2));
				}
				
				this.__flags.split(',').forEach(function(elem){
					if(elem)
						input.setAttribute("data-" + elem.trim(), "");
				});
				
				input.addEventListener('input', () => {
					this.model.value = this.__input.value;
					this.model = answerChanged(this.model);
					this.__warningMarker.classList.add('yaq-hidden');
					this.render();
					this.__onChange();
				});
				
				root.append(input);

				this.__warningMarker = createElement("span", "yaq-hidden yaq-warning-marker", "⚠");
				this.__warningMarker.dataset.role = "warningMarker";
				this.__warningMarker.setAttribute("role", "alert");
				root.append(this.__warningMarker);

				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				this.model = resetAnswer({ ...this.model, value: "" });
				this.__warningMarker.classList.add('yaq-hidden');
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
					var mathEq = q.hasAttribute('data-math');
					var fuzzy = q.hasAttribute('data-fuzzy');
					var sequence = q.hasAttribute('data-sequence');
					var nospace = q.hasAttribute('data-nospace');
					var regex = q.hasAttribute('data-regex');
					var ordered = q.hasAttribute('data-ordered');
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
							this.__warningMarker.title = texts['wrongMathVariableError'] + Object.keys(this.__math_vars).join(", ");
						} else if (e instanceof SyntaxError){
							this.__warningMarker.title = texts['wrongMathSyntaxError'] + " " + e.message;
						} else {
							this.__warningMarker.title = texts['wrongMathError'] + e.message;
						}
						this.__warningMarker.classList.remove('yaq-hidden');
						this.__warningMarker.textContent = "⚠ " + this.__warningMarker.title;
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
			this.__values = getDefault(params["values"], "");
			this.__answer = getDefault(params["answer"], "");
			
			this.rootDomElement = undefined;
			this.__input = undefined;
			this.__onChange = onChange || function() {};
			
			this.__updateEnabled = function(){
				this.__input.disabled = !this.model.enabled;
			};
			
			this.__updateState = function(){
				
			};
			
			this.__updateSelectedElement = function(){
				if(this.model.selectedValue !== this.__input.value)
				{
					this.__input.value = this.model.selectedValue;
				}
				
			}
			;

			this.render = function(){
				this.__updateEnabled();
				this.__updateSelectedElement();
			};
			this.__initDomElement = function(){
				var root = createElement("span", "yaq-FBQuestion");
				this.rootDomElement = root;
				
				var input = createElement("select");
				this.__input = input;
				const emptyOption = createElement("option");
				emptyOption.value = "";
				input.append(emptyOption);
				this.__values.split(",").forEach(function(elem){
					elem = elem.trim();
					const option = createElement("option", null, elem);
					option.value = elem;
					input.append(option);
				}
				);

				
				input.addEventListener('change', () => {
					this.model.selectedValue = this.__input.value;
					this.model = answerChanged(this.model);
					this.render();
					this.__onChange();
				});
				
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
				var root = createElement("span", "yaq-TFQuestion");
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
		
		function QuestionContainer(innerQuestionParams,rootElement,onChange, context){
		
			this.model = getDefaultModel();
			this.rootDomElement = rootElement;

			this.__innerQuestion = undefined;
			this.__wrongMarker = undefined;
			this.__correctMarker = undefined;
			this.__infoMarker = undefined;
			this.__unansweredMarker = undefined;
			this.__gradedUnanswered = false;
			this.__onChange = onChange || function() {};
			
			this.__updateEnabled = function(){
				this.__innerQuestion.getModel().enabled = this.model.enabled;
				this.__innerQuestion.render();
			};
			
			this.__updateState = function(){
				this.model.state = this.__innerQuestion.getModel().state;
				if(this.model.state == QuestionStateEnum.unsolved){
					this.__wrongMarker.classList.add('yaq-hidden');
					this.__correctMarker.classList.add('yaq-hidden');
					this.__infoMarker.classList.add('yaq-hidden');
					this.__unansweredMarker.classList.toggle('yaq-hidden', !this.__gradedUnanswered);
				} else if (this.model.state & QuestionStateEnum.correct){
					this.__unansweredMarker.classList.add('yaq-hidden');
					this.__wrongMarker.classList.add('yaq-hidden');
					this.__correctMarker.classList.remove('yaq-hidden');
					this.__infoMarker.classList.add('yaq-hidden');
				}else if (this.model.state & QuestionStateEnum.wrong){
					this.__unansweredMarker.classList.add('yaq-hidden');
					this.__wrongMarker.classList.remove('yaq-hidden');
					this.__correctMarker.classList.add('yaq-hidden');
					this.__infoMarker.classList.add('yaq-hidden');
				} else if (this.model.state &  QuestionStateEnum.solved){
					this.__unansweredMarker.classList.add('yaq-hidden');
					this.__wrongMarker.classList.add('yaq-hidden');
					this.__correctMarker.classList.add('yaq-hidden');
					this.__infoMarker.classList.remove('yaq-hidden');
				}
			};

			this.__innerChanged = function(){
				this.__gradedUnanswered = false;
				this.model.innerModel = this.__innerQuestion.getModel();
				this.__updateState();
				this.__onChange();
			};
			
			this.__initDomElement = function(innerQuestionParams){
				var root ;
				if(!this.rootDomElement)
				{
					root = createElement("span", "yaq-Question");
					this.rootDomElement = root;
				} else{
					root = this.rootDomElement;
					root.classList.remove("yaq-q");
					root.classList.add("yaq-Question");
				}
				
				
					

				var QuestionConstructor = questionConstructors[innerQuestionParams.type];
				if(!QuestionConstructor)
					throw new Error("Unsupported YAQ question type: " + innerQuestionParams.type);
				this.__innerQuestion = new QuestionConstructor(innerQuestionParams, this.__innerChanged.bind(this));
				this.model.innerModel = this.__innerQuestion.getModel();
				root.append(this.__innerQuestion.getRootElement());
				const field = root.querySelector('input, select');
				if (field) field.setAttribute("aria-label", context);
				const switchGroup = root.querySelector('.yaq-switch3');
				if (switchGroup) {
					switchGroup.setAttribute("role", "group");
					switchGroup.setAttribute("aria-label", context);
					switchGroup.querySelectorAll("button").forEach((button, index) => {
						button.setAttribute("aria-label", ["True", "Unanswered", "False"][index]);
					});
				}
					
				this.__wrongMarker = createFeedbackMarker("yaq-wrong-marker", "wrongMarker", "✘", "Incorrect");
				this.__correctMarker = createFeedbackMarker("yaq-correct-marker", "correctMarker", "✔", "Correct");
				this.__infoMarker = createFeedbackMarker("yaq-solution-marker", "solutionMarker", "ⓘ", "Solution shown");
				this.__unansweredMarker = createFeedbackMarker("yaq-unanswered-marker", "unansweredMarker", "?", "Unanswered");
				root.append(this.__wrongMarker);
				root.append(this.__correctMarker);
				root.append(this.__infoMarker);
				root.append(this.__unansweredMarker);
					
				this.__updateEnabled();
				this.__updateState();
			};
			
			this.reset = function(){
				this.__gradedUnanswered = false;
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
				this.__gradedUnanswered = this.__innerQuestion.getModel().state === QuestionStateEnum.unsolved;
				this.__updateState();
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

		function QuizActivity(sourceElement, onChange){
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
			
			this.__initDomElement = function(sourceElement){
				var root = createElement("div", "yaq-activity");
				this.rootDomElement = root;
				root.append(...Array.from(sourceElement.cloneNode(true).childNodes));
				const placeholders = Array.from(root.querySelectorAll('.yaq-q'));
				const contexts = placeholders.map((elem, index) => questionContext(elem, index));
				placeholders.forEach((elem, index) => {
					try {
						var textmodel = __b64DecodeUnicode(elem.getAttribute('data-model'));
						var model = JSON.parse(textmodel);
						var question = new QuestionContainer(model, elem, this.__questionChanged.bind(this), contexts[index]);
						this.__questions.push(question);
						this.model['innerModel' + index] = question.getModel();
					} catch (error) {
						console.error("YAQ: Error while initializing question.", error);
						elem.classList.remove("yaq-q", "yaq-Question");
						elem.classList.add("yaq-question-fallback");
						elem.append(createElement("span", null, " Interactive question unavailable."));
					}
				});
				
				this.__updateState();
				this.__updateEnabled();
			};
			
	
			
			this.__initDomElement(sourceElement);
			

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

		function Quiz(sourceElement,params,fingerprint){

			
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
			this.__status = undefined;
			this.__statusText = undefined;
			this.__announce = function(action){
				const states = this.__activity.__questions.map(question => question.getModel().state);
				const count = state => states.filter(value => value === state).length;
				this.__statusText.textContent = action + ": " + count(QuestionStateEnum.correct) + " correct, " +
					count(QuestionStateEnum.wrong) + " incorrect, " + count(QuestionStateEnum.unsolved) +
					" unanswered, " + count(QuestionStateEnum.solved) + " solution shown.";
			};

			this.__updateEnabled = function()
			{
				[this.__buttonGrade, this.__buttonReset, this.__buttonSolve].forEach(button => {
					button.disabled = !this.model.enabled;
					button.classList.toggle("yaq-interractiveElement", this.model.enabled);
				});
				
				this.__activity.setEnabled(this.model.enabled);
			};
					
			this.__updateState = function()
			{
				var flagEnd = Boolean(this.model.state & ActivityStateEnum.ended);
				setVisible(this.__buttonReset, flagEnd);
				setVisible(this.__buttonGrade, !flagEnd && Boolean(this.model.state & ActivityStateEnum.ongoing));
				setVisible(this.__buttonSolve, !flagEnd && Boolean(this.model.state & ActivityStateEnum.solvable));
			};

			this.__activityChanged = function(){
				this.model.innerModel = this.__activity.getModel();
				this.model.state = this.__activity.getModel().state;
				this.__updateState();
				this.__updateModel();
			};
			
			this.grade = function(){
				this.__activity.grade();
				this.__announce("Grading complete");
			};
			
			this.solve = function(){
				this.__activity.solve();
				this.__announce("Solutions shown");
			};
			
			this.reset = function(){
				this.__activity.reset();
				this.model.enabled=true;
				this.__updateEnabled();
				self.storage.remove(this.__uid);
				this.__announce("Quiz restarted");
			};
			
			this.__initEvent = function(){
				this.__buttonGrade.addEventListener("click", this.grade.bind(this));
				this.__buttonSolve.addEventListener("click", this.solve.bind(this));
				this.__buttonReset.addEventListener("click", this.reset.bind(this));
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
			
			
			
			this.__initDomElement = function(sourceElement){
				
				var root = createElement("div", "yaq-root");
				this.rootDomElement = root;
				const heading = createElement("h2", "yaq-head", "Exercice " + (this.__exerciceNumber + 1) + " : " + this.__title);
				root.append(heading);
				root.setAttribute("role", "region");
				root.setAttribute("aria-label", heading.textContent);
				
				var mainContent = createElement("div", "yaq-main-content");
				root.append(mainContent);
				
				this.__activity = new QuizActivity(sourceElement, this.__activityChanged.bind(this));
				this.model.innerModel = this.__activity.getModel();
				mainContent.append(this.__activity.getRootElement());
				this.model.state = this.__activity.getModel().state;
				
				
				var footer = createElement("div", "yaq-footer");
				
				if(this.__activity.getNumberOfQuestions()===0)
					footer.classList.add("yaq-hidden");
				
				this.__buttonGrade = createElement("button", "yaq-button", texts["gradeButtonText"]);
				this.__buttonGrade.type = "button";
				footer.append(this.__buttonGrade);
				this.__buttonSolve = createElement("button", "yaq-button", texts["solveButtonText"]);
				this.__buttonSolve.type = "button";
				footer.append(this.__buttonSolve);
				this.__buttonReset = createElement("button", "yaq-button", texts["resetButtonText"]);
				this.__buttonReset.type = "button";
				footer.append(this.__buttonReset);
				this.__status = createElement("div", "yaq-status");
				this.__status.setAttribute("role", "status");
				this.__status.setAttribute("aria-live", "polite");
				this.__statusText = createElement("span", "yaq-visually-hidden");
				this.__status.append(this.__statusText);
				footer.append(this.__status);
				
				
				
				root.append(footer);
				
				this.__updateEnabled();
				this.__updateState();
				this.__initEvent();
			};
			
			this.__initDomElement(sourceElement);
			
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
	
	function initFromObj(element, index, model)
	{
		model.exerciceNumber = index;
		var definitions = Array.from(element.querySelectorAll(".yaq-q"), question => question.getAttribute("data-model"));
		var fingerprint = fingerprintQuizDefinition(definitions);
		var quiz = new Quiz(element, model, fingerprint);
		var storedState = self.storage.load(quiz.__uid, fingerprint);
		if(storedState && !quiz.restore(storedState)) self.storage.remove(quiz.__uid);
		quizz.push(quiz);
		quizIdentifiers.add(quiz.__uid);
		element.replaceChildren(quiz.getRootElement());
		
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
		document.querySelectorAll(".yaq").forEach((element, index) => {
			var model = element.getAttribute('data-model');
			try {
				if(model)
				{
					model = JSON.parse(model);
					initFromObj(element, index, model);
				}
				else throw new Error("Empty model in YAQ quiz");
				
			}
			catch (error) {
			   console.error("YAQ: Error while initializing quiz.", error);
			   element.classList.add("yaq-quiz-fallback");
			   element.append(createElement("p", null, "Interactive quiz unavailable."));
			}
			
			element.classList.add("yaq-active");
		});
		window.addEventListener("pagehide", () => {
			self.storage.flush();
		});
    };

	
	
    return self;
})();

globalThis.yaq_app = yaq_app;

document.addEventListener("DOMContentLoaded", function() {
    yaq_app.init();
	document.querySelectorAll(".yaq-spoiler-inline-hidden").forEach(element => {
		element.addEventListener("click", () => {
			element.classList.remove("yaq-spoiler-inline-hidden");
			element.removeAttribute("aria-label");
			element.disabled = true;
		});
	});
	// Remove single letter units from maths.js... hugly hack
	for(var i=0; i < 26; i++){
		var letter = String.fromCharCode(97 + i);
		var letterCap = String.fromCharCode(65 + i);

		delete math.Unit.UNITS[letter];
		delete math.Unit.UNITS[letterCap];
	}
});
