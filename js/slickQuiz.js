/*!
 * SlickQuiz jQuery Plugin
 * http://github.com/jewlofthelotus/SlickQuiz
 *
 * @updated October 25, 2014
 * @version 1.5.20
 *
 * @author Julie Cameron - http://www.juliecameron.com
 * @copyright (c) 2013 Quicken Loans - http://www.quickenloans.com
 * @license MIT
 */

(function($){
    $.slickQuiz = function(element, options) {
        var plugin   = this,
            $element = $(element),
            _element = '#' + $element.attr('id'),

            defaults = {
                checkAnswerText:  'Verificar Respuesta',
                nextQuestionText: 'Siguiente &raquo;',
                backButtonText: '',
                completeQuizText: '',
                tryAgainText: '',
                questionCountText: 'Pregunta %current de %total',
                preventUnansweredText: 'Tienes que seleccionar por lo menos una respuesta.',
                questionTemplateText:  '%count. %text',
                scoreTemplateText: '%score / %total',
                nameTemplateText:  '<span>Prueba: </span>%name',
                skipStartButton: false,
                numberOfQuestions: null,
                randomSortQuestions: false,
                randomSortAnswers: false,
                preventUnanswered: false,
                disableScore: false,
                disableRanking: false,
                scoreAsPercentage: false,
                perQuestionResponseMessaging: true,
                perQuestionResponseAnswers: false,
                completionResponseMessaging: false,
                displayQuestionCount: true,   // Deprecate?
                displayQuestionNumber: true,  // Deprecate?
                animationCallbacks: { // only for the methods that have jQuery animations offering callback
                    setupQuiz: function () {},
                    startQuiz: function () {},
                    resetQuiz: function () {},
                    checkAnswer: function () {},
                    nextQuestion: function () {},
                    backToQuestion: function () {},
                    completeQuiz: function () {}
                },
                events: {
                    onStartQuiz: function (options) {},
                    onCompleteQuiz: function (options) {}  // reserved: options.questionCount, options.score
                }
            },

            // Class Name Strings (Used for building quiz and for selectors)
            questionCountClass     = 'questionCount',
            questionGroupClass     = 'questions',
            questionClass          = 'question',
            answersClass           = 'answers',
            responsesClass         = 'responses',
            completeClass          = 'complete',
            correctClass           = 'correctResponse',
            incorrectClass         = 'incorrectResponse',
            correctResponseClass   = 'correct',
            incorrectResponseClass = 'incorrect',
            checkAnswerClass       = 'checkAnswer',
            nextQuestionClass      = 'nextQuestion',
            lastQuestionClass      = 'lastQuestion',
            backToQuestionClass    = 'backToQuestion',
            tryAgainClass          = 'tryAgain',

            // Sub-Quiz / Sub-Question Class Selectors
            _questionCount         = '.' + questionCountClass,
            _questions             = '.' + questionGroupClass,
            _question              = '.' + questionClass,
            _answers               = '.' + answersClass,
            _answer                = '.' + answersClass + ' li',
            _responses             = '.' + responsesClass,
            _response              = '.' + responsesClass + ' li',
            _correct               = '.' + correctClass,
            _correctResponse       = '.' + correctResponseClass,
            _incorrectResponse     = '.' + incorrectResponseClass,
            _checkAnswerBtn        = '.' + checkAnswerClass,
            _nextQuestionBtn       = '.' + nextQuestionClass,
            _prevQuestionBtn       = '.' + backToQuestionClass,
            _tryAgainBtn           = '.' + tryAgainClass,

            // Top Level Quiz Element Class Selectors
            _quizStarter           = _element + ' .startQuiz',
            _quizName              = _element + ' .quizName',
            _quizArea              = _element + ' .quizArea',
            _quizResults           = _element + ' .quizResults',
            _quizResultsCopy       = _element + ' .quizResultsCopy',
            _quizHeader            = _element + ' .quizHeader',
            _quizScore             = _element + ' .quizScore',
            _quizLevel             = _element + ' .quizLevel',

            // Top Level Quiz Element Objects
            $quizStarter           = $(_quizStarter),
            $quizName              = $(_quizName),
            $quizArea              = $(_quizArea),
            $quizResults           = $(_quizResults),
            $quizResultsCopy       = $(_quizResultsCopy),
            $quizHeader            = $(_quizHeader),
            $quizScore             = $(_quizScore),
            $quizLevel             = $(_quizLevel)
        ;


        // Reassign user-submitted deprecated options
        var depMsg = '';

        if (options && typeof options.disableNext != 'undefined') {
            if (typeof options.preventUnanswered == 'undefined') {
                options.preventUnanswered = options.disableNext;
            }
            depMsg += 'The \'disableNext\' option has been deprecated, please use \'preventUnanswered\' in it\'s place.\n\n';
        }

        if (options && typeof options.disableResponseMessaging != 'undefined') {
            if (typeof options.preventUnanswered == 'undefined') {
                options.perQuestionResponseMessaging = options.disableResponseMessaging;
            }
            depMsg += 'The \'disableResponseMessaging\' option has been deprecated, please use' +
                      ' \'perQuestionResponseMessaging\' and \'completionResponseMessaging\' in it\'s place.\n\n';
        }

        if (options && typeof options.randomSort != 'undefined') {
            if (typeof options.randomSortQuestions == 'undefined') {
                options.randomSortQuestions = options.randomSort;
            }
            if (typeof options.randomSortAnswers == 'undefined') {
                options.randomSortAnswers = options.randomSort;
            }
            depMsg += 'The \'randomSort\' option has been deprecated, please use' +
                      ' \'randomSortQuestions\' and \'randomSortAnswers\' in it\'s place.\n\n';
        }

        if (depMsg !== '') {
            if (typeof console != 'undefined') {
                console.warn(depMsg);
            } else {
                alert(depMsg);
            }
        }
        // End of deprecation reassignment


        plugin.config = $.extend(defaults, options);

        // Set via json option or quizJSON variable (see slickQuiz-config.js)
        var quizValues = (plugin.config.json ? plugin.config.json : typeof quizJSON != 'undefined' ? quizJSON : null);

        // Get questions, possibly sorted randomly
        var questions = plugin.config.randomSortQuestions ?
                        quizValues.questions.sort(function() { return (Math.round(Math.random())-0.5); }) :
                        quizValues.questions;

        // Count the number of questions
        var questionCount = questions.length;

        // Select X number of questions to load if options is set
        if (plugin.config.numberOfQuestions && questionCount >= plugin.config.numberOfQuestions) {
            questions = questions.slice(0, plugin.config.numberOfQuestions);
            questionCount = questions.length;
        }

        // some special private/internal methods
        var internal = {method: {
            // get a key whose notches are "resolved jQ deferred" objects; one per notch on the key
            // think of the key as a house key with notches on it
            getKey: function (notches) { // returns [], notches >= 1
                var key = [];
                for (i=0; i<notches; i++) key[i] = $.Deferred ();
                return key;
            },

            // put the key in the door, if all the notches pass then you can turn the key and "go"
            turnKeyAndGo: function (key, go) { // key = [], go = function ()
                // when all the notches of the key are accepted (resolved) then the key turns and the engine (callback/go) starts
                $.when.apply (null, key). then (function () {
                    go ();
                });
            },

            // get one jQ
            getKeyNotch: function (key, notch) { // notch >= 1, key = []
                // key has several notches, numbered as 1, 2, 3, ... (no zero notch)
                // we resolve and return the "jQ deferred" object at specified notch
                return function () {
                    key[notch-1].resolve (); // it is ASSUMED that you initiated the key with enough notches
                };
            }
        }};

        plugin.method = {
            // Sets up the questions and answers based on above array
            setupQuiz: function(options) { // use 'options' object to pass args
                var key, keyNotch, kN;
                key = internal.method.getKey (3); // how many notches == how many jQ animations you will run
                keyNotch = internal.method.getKeyNotch; // a function that returns a jQ animation callback function
                kN = keyNotch; // you specify the notch, you get a callback function for your animation

                $quizName.hide().html(plugin.config.nameTemplateText
                    .replace('%name', quizValues.info.name) ).fadeIn(1000, kN(key,1));
                $quizHeader.hide().prepend($('<div class="quizDescription">' + quizValues.info.main + '</div>')).fadeIn(1000, kN(key,2));
                $quizResultsCopy.append(quizValues.info.results);

                // add retry button to results view, if enabled
                if (plugin.config.tryAgainText && plugin.config.tryAgainText !== '') {
                    $quizResultsCopy.append('<p><a class="button ' + tryAgainClass + '" href="#">' + plugin.config.tryAgainText + '</a></p>');
                }

                // Setup questions
                var quiz  = $('<ol class="' + questionGroupClass + '"></ol>'),
                    count = 1;

                // Loop through questions object
                for (i in questions) {
                    if (questions.hasOwnProperty(i)) {
                        var question = questions[i];

                        var questionHTML = $('<li class="' + questionClass +'" id="question' + (count - 1) + '"></li>');

                        if (plugin.config.displayQuestionCount) {
                            questionHTML.append('<div class="' + questionCountClass + '">' +
                                plugin.config.questionCountText
                                    .replace('%current', '<span class="current">' + count + '</span>')
                                    .replace('%total', '<span class="total">' +
                                        questionCount + '</span>') + '</div>');
                        }

                        var formatQuestion = '';
                        if (plugin.config.displayQuestionNumber) {
                            formatQuestion = plugin.config.questionTemplateText
                                .replace('%count', count).replace('%text', question.q);
                        } else {
                            formatQuestion = question.q;
                        }
                        questionHTML.append('<h3>' + formatQuestion + '</h3>');

                        // Count the number of true values
                        var truths = 0;
                        for (i in question.a) {
                            if (question.a.hasOwnProperty(i)) {
                                answer = question.a[i];
                                if (answer.correct) {
                                    truths++;
                                }
                            }
                        }

                        // Now let's append the answers with checkboxes or radios depending on truth count
                        var answerHTML = $('<ul class="' + answersClass + '"></ul>');

                        // Get the answers
                        var answers = plugin.config.randomSortAnswers ?
                            question.a.sort(function() { return (Math.round(Math.random())-0.5); }) :
                            question.a;

                        // prepare a name for the answer inputs based on the question
                        var selectAny     = question.select_any ? question.select_any : false,
                            forceCheckbox = question.force_checkbox ? question.force_checkbox : false,
                            checkbox      = (truths > 1 && !selectAny) || forceCheckbox,
                            inputName     = $element.attr('id') + '_question' + (count - 1),
                            inputType     = checkbox ? 'checkbox' : 'radio';

                        if( count == quizValues.questions.length ) {
                            nextQuestionClass = nextQuestionClass + ' ' + lastQuestionClass;
                        }

                        for (i in answers) {
                            if (answers.hasOwnProperty(i)) {
                                answer   = answers[i],
                                optionId = inputName + '_' + i.toString();

                                // If question has >1 true answers and is not a select any, use checkboxes; otherwise, radios
                                var input = '<input id="' + optionId + '" name="' + inputName +
                                            '" type="' + inputType + '" /> ';

                                // REPL LINE var optionLabel = '<label for="' + optionId + '">' + answer.option + '</label>';
                                var optionLabel = '<label>' + answer.option + '</label>';

                                var readyContent = $('<li></li>');
                                var answerContent = $('<div></div>')
                                    .append(input)
                                    .append(optionLabel);
                                readyContent.append(answerContent)
                                answerHTML.append(readyContent);
                            }
                        }

                        // Append answers to question
                        questionHTML.append(answerHTML);

                        // If response messaging is NOT disabled, add it
                        if (plugin.config.perQuestionResponseMessaging || plugin.config.completionResponseMessaging) {
                            // Now let's append the correct / incorrect response messages
                            var responseHTML = $('<ul class="' + responsesClass + '"></ul>');
                            responseHTML.append('<li class="' + correctResponseClass + '">' + question.correct + '</li>');
                            responseHTML.append('<li class="' + incorrectResponseClass + '">' + question.incorrect + '</li>');
                            // Append responses to question
                            questionHTML.append(responseHTML);
                        }

                        // Appends check answer / back / next question buttons
                        if (plugin.config.backButtonText && plugin.config.backButtonText !== '') {
                            questionHTML.append('<a href="#" class="button ' + backToQuestionClass + '">' + plugin.config.backButtonText + '</a>');
                        }

                        var nextText = plugin.config.nextQuestionText;
                        if (plugin.config.completeQuizText && count == questionCount) {
                            nextText = plugin.config.completeQuizText;
                        }

                        // If we're not showing responses per question, show next question button and make it check the answer too
                        if (!plugin.config.perQuestionResponseMessaging) {
                            questionHTML.append('<a href="#" class="button ' + nextQuestionClass + ' ' + checkAnswerClass + '">' + nextText + '</a>');
                        } else {
                            questionHTML.append('<a href="#" class="button ' + nextQuestionClass + '">' + nextText + '</a>');
                            questionHTML.append('<a href="#" class="button ' + checkAnswerClass + '" style="display: block;">' + plugin.config.checkAnswerText + '</a>');
                        }

                        // Append question & answers to quiz
                        quiz.append(questionHTML);

                        count++;
                    }
                }

                // Add the quiz content to the page
                $quizArea.append(quiz);
                
                $quizArea.children('ol').find('li > ul > li').on('click', function(e) {
                     e.stopImmediatePropagation();
                     var $checkbox = $(this).children('div').children('input');
                     if ( $checkbox.is("[type='radio']") ) {
                         $checkbox.prop('checked', !$checkbox[0].checked);
                         if ( $(this).siblings().hasClass("selected") ) {
                             $(this).siblings().removeClass("selected");
                         }
                         $(this).toggleClass('selected');
                     } else if ( $checkbox.is("[type='checkbox']") ) {
                         $checkbox.prop('checked', !$checkbox[0].checked);
                         $(this).toggleClass('selected');
                     }
                });
                
                $quizArea.children('ol').find('li > ul > li > div > label').on('click', function(e) {
                    e.stopImmediatePropagation();
                    $(this).closest('li').trigger('click');
                });

                // Toggle the start button OR start the quiz if start button is disabled
                if (plugin.config.skipStartButton || $quizStarter.length == 0) {
                    $quizStarter.hide();
                    plugin.method.startQuiz.apply (this, [{callback: plugin.config.animationCallbacks.startQuiz}]); // TODO: determine why 'this' is being passed as arg to startQuiz method
                    kN(key,3).apply (null, []);
                } else {
                    $quizStarter.fadeIn(500, kN(key,3)).css('display', 'block'); // 3d notch on key must be on both sides of if/else, otherwise key won't turn
                }

                internal.method.turnKeyAndGo (key, options && options.callback ? options.callback : function () {});
            },

            // Starts the quiz (hides start button and displays first question)
            startQuiz: function(options) {
                var key, keyNotch, kN;
                key = internal.method.getKey (1); // how many notches == how many jQ animations you will run
                keyNotch = internal.method.getKeyNotch; // a function that returns a jQ animation callback function
                kN = keyNotch; // you specify the notch, you get a callback function for your animation

                function start(options) {
                    var firstQuestion = $(_element + ' ' + _questions + ' li').first();
                    if (firstQuestion.length) {
                        firstQuestion.fadeIn(500, function () {
                            if (options && options.callback) options.callback ();
                        }).css("display","block");
                    }
                }

                if (plugin.config.skipStartButton || $quizStarter.length == 0) {
                    start({callback: kN(key,1)});
                } else {
                    $quizStarter.fadeOut(300, function(){
                        start({callback: kN(key,1)}); // 1st notch on key must be on both sides of if/else, otherwise key won't turn
                    });
                }

                internal.method.turnKeyAndGo (key, options && options.callback ? options.callback : function () {});

                if (plugin.config.events &&
                        plugin.config.events.onStartQuiz) {
                    plugin.config.events.onStartQuiz.apply (null, []);
                }
            },

            // Resets (restarts) the quiz (hides results, resets inputs, and displays first question)
            resetQuiz: function(startButton, options) {
                var key, keyNotch, kN;
                key = internal.method.getKey (1); // how many notches == how many jQ animations you will run
                keyNotch = internal.method.getKeyNotch; // a function that returns a jQ animation callback function
                kN = keyNotch; // you specify the notch, you get a callback function for your animation

                $quizResults.fadeOut(300, function() {
                    $(_element + ' input').prop('checked', false).prop('disabled', false);

                    $quizLevel.attr('class', 'quizLevel');
                    $(_element + ' ' + _question).removeClass(correctClass).removeClass(incorrectClass).remove(completeClass);
                    $(_element + ' ' + _answer).removeClass(correctResponseClass).removeClass(incorrectResponseClass);

                    $(_element + ' ' + _question          + ',' +
                      _element + ' ' + _responses         + ',' +
                      _element + ' ' + _response          + ',' +
                      _element + ' ' + _nextQuestionBtn   + ',' +
                      _element + ' ' + _prevQuestionBtn
                    ).hide();

                    $(_element + ' ' + _questionCount + ',' +
                      _element + ' ' + _answers + ',' +
                      _element + ' ' + _checkAnswerBtn
                    ).show();

                    $quizArea.append($(_element + ' ' + _questions)).show();

                    kN(key,1).apply (null, []);

                    plugin.method.startQuiz({callback: plugin.config.animationCallbacks.startQuiz},$quizResults); // TODO: determine why $quizResults is being passed
                });

                internal.method.turnKeyAndGo (key, options && options.callback ? options.callback : function () {});
            },

            // Validates the response selection(s), displays explanations & next question button
            checkAnswer: function(checkButton, options) {
                var key, keyNotch, kN;
                key = internal.method.getKey (2); // how many notches == how many jQ animations you will run
                keyNotch = internal.method.getKeyNotch; // a function that returns a jQ animation callback function
                kN = keyNotch; // you specify the notch, you get a callback function for your animation

                var questionLI    = $($(checkButton).parents(_question)[0]),
                    answerLIs     = questionLI.find(_answers + ' li'),
                    answerSelects = answerLIs.find('input:checked'),
                    questionIndex = parseInt(questionLI.attr('id').replace(/(question)/, ''), 10),
                    answers       = questions[questionIndex].a,
                    selectAny     = questions[questionIndex].select_any ? questions[questionIndex].select_any : false;

                answerLIs.addClass(incorrectResponseClass);

                // Collect the true answers needed for a correct response
                var trueAnswers = [];
                for (i in answers) {
                    if (answers.hasOwnProperty(i)) {
                        var answer = answers[i],
                            index  = parseInt(i, 10);

                        if (answer.correct) {
                            trueAnswers.push(index);
                            answerLIs.eq(index).removeClass(incorrectResponseClass).addClass(correctResponseClass);
                        }
                    }
                }

                // TODO: Now that we're marking answer LIs as correct / incorrect, we might be able
                // to do all our answer checking at the same time

                // NOTE: Collecting answer index for comparison aims to ensure that HTML entities
                // and HTML elements that may be modified by the browser / other scrips match up

                // Collect the answers submitted
                var selectedAnswers = [];
                answerSelects.each( function() {
                    var id = $(this).attr('id');
                    selectedAnswers.push(parseInt(id.replace(/(.*\_question\d{1,}_)/, ''), 10));
                });

                if (plugin.config.preventUnanswered && selectedAnswers.length === 0) {
                    alert(plugin.config.preventUnansweredText);
                    return false;
                }

                // Verify all/any true answers (and no false ones) were submitted
                var correctResponse = plugin.method.compareAnswers(trueAnswers, selectedAnswers, selectAny);

                if (correctResponse) {
                    questionLI.addClass(correctClass);
                } else {
                    questionLI.addClass(incorrectClass);
                }

                // Toggle appropriate response (either for display now and / or on completion)
                questionLI.find(correctResponse ? _correctResponse : _incorrectResponse).show().css('display', 'block');

                // If perQuestionResponseMessaging is enabled, toggle response and navigation now
                if (plugin.config.perQuestionResponseMessaging) {
                    $(checkButton).hide();
                    if (!plugin.config.perQuestionResponseAnswers) {
                        // Make sure answers don't highlight for a split second before they hide
                        questionLI.find(_answers).hide({
                            duration: 0,
                            complete: function() {
                                questionLI.addClass(completeClass);
                            }
                        });
                    } else {
                        questionLI.addClass(completeClass);
                    }
                    questionLI.find('input').prop('disabled', true);
                    questionLI.find(_responses).show().css('display', 'block');
                    questionLI.find(_nextQuestionBtn).fadeIn(300, kN(key,1)).css('display', 'block');
                    questionLI.find(_prevQuestionBtn).fadeIn(300, kN(key,2)).css('display', 'block');
                    if (!questionLI.find(_prevQuestionBtn).length) kN(key,2).apply (null, []); // 2nd notch on key must be passed even if there's no "back" button
                } else {
                    kN(key,1).apply (null, []); // 1st notch on key must be on both sides of if/else, otherwise key won't turn
                    kN(key,2).apply (null, []); // 2nd notch on key must be on both sides of if/else, otherwise key won't turn
                }

                internal.method.turnKeyAndGo (key, options && options.callback ? options.callback : function () {});
            },

            // Moves to the next question OR completes the quiz if on last question
            nextQuestion: function(nextButton, options) {
                var key, keyNotch, kN;
                key = internal.method.getKey (1); // how many notches == how many jQ animations you will run
                keyNotch = internal.method.getKeyNotch; // a function that returns a jQ animation callback function
                kN = keyNotch; // you specify the notch, you get a callback function for your animation

                var currentQuestion = $($(nextButton).parents(_question)[0]),
                    nextQuestion    = currentQuestion.next(_question),
                    answerInputs    = currentQuestion.find('input:checked');

                // If response messaging has been disabled or moved to completion,
                // make sure we have an answer if we require it, let checkAnswer handle the alert messaging
                if (plugin.config.preventUnanswered && answerInputs.length === 0) {
                    return false;
                }

                if (nextQuestion.length) {
                    currentQuestion.fadeOut(300, function(){
                        nextQuestion.find(_prevQuestionBtn).show().end().fadeIn(500, kN(key,1)).css('display', 'block');
                        if (!nextQuestion.find(_prevQuestionBtn).show().end().length) kN(key,1).apply (null, []); // 1st notch on key must be passed even if there's no "back" button
                    });
                } else {
                    kN(key,1).apply (null, []); // 1st notch on key must be on both sides of if/else, otherwise key won't turn
                    plugin.method.completeQuiz({callback: plugin.config.animationCallbacks.completeQuiz});
                }

                internal.method.turnKeyAndGo (key, options && options.callback ? options.callback : function () {});
            },

            // Go back to the last question
            backToQuestion: function(backButton, options) {
                var key, keyNotch, kN;
                key = internal.method.getKey (2); // how many notches == how many jQ animations you will run
                keyNotch = internal.method.getKeyNotch; // a function that returns a jQ animation callback function
                kN = keyNotch; // you specify the notch, you get a callback function for your animation

                var questionLI = $($(backButton).parents(_question)[0]),
                    responses  = questionLI.find(_responses);

                // Back to question from responses
                if (responses.css('display') === 'block' ) {
                    questionLI.find(_responses).fadeOut(300, function(){
                        questionLI.removeClass(correctClass).removeClass(incorrectClass).removeClass(completeClass);
                        questionLI.find(_responses + ', ' + _response).hide();
                        questionLI.find(_answers).show();
                        questionLI.find(_answer).removeClass(correctResponseClass).removeClass(incorrectResponseClass);
                        questionLI.find('input').prop('disabled', false);
                        questionLI.find(_answers).fadeIn(500, kN(key,1)).css('display', 'block'); // 1st notch on key must be on both sides of if/else, otherwise key won't turn
                        questionLI.find(_checkAnswerBtn).fadeIn(500, kN(key,2)).css('display', 'block');
                        questionLI.find(_nextQuestionBtn).hide();

                        // if question is first, don't show back button on question
                        if (questionLI.attr('id') != 'question0') {
                            questionLI.find(_prevQuestionBtn).show();
                        } else {
                            questionLI.find(_prevQuestionBtn).hide();
                        }
                    });

                // Back to previous question
                } else {
                    var prevQuestion = questionLI.prev(_question);

                    questionLI.fadeOut(300, function() {
                        prevQuestion.removeClass(correctClass).removeClass(incorrectClass).removeClass(completeClass);
                        prevQuestion.find(_responses + ', ' + _response).hide();
                        prevQuestion.find(_answers).show();
                        prevQuestion.find(_answer).removeClass(correctResponseClass).removeClass(incorrectResponseClass);
                        prevQuestion.find('input').prop('disabled', false);
                        prevQuestion.find(_nextQuestionBtn).hide();
                        prevQuestion.find(_checkAnswerBtn).show();

                        if (prevQuestion.attr('id') != 'question0') {
                            prevQuestion.find(_prevQuestionBtn).show();
                        } else {
                            prevQuestion.find(_prevQuestionBtn).hide();
                        }

                        prevQuestion.fadeIn(500, kN(key,1)).css('display', 'block');
                        kN(key,2).apply (null, []); // 2nd notch on key must be on both sides of if/else, otherwise key won't turn
                    });
                }

                internal.method.turnKeyAndGo (key, options && options.callback ? options.callback : function () {});
            },

            // Hides all questions, displays the final score and some conclusive information
            completeQuiz: function(options) {
                var key, keyNotch, kN;
                key = internal.method.getKey (1); // how many notches == how many jQ animations you will run
                keyNotch = internal.method.getKeyNotch; // a function that returns a jQ animation callback function
                kN = keyNotch; // you specify the notch, you get a callback function for your animation

                var score        = $(_element + ' ' + _correct).length,
                    displayScore = score;
                if (plugin.config.scoreAsPercentage) {
                    displayScore = (score / questionCount).toFixed(2)*100 + "%";
                }

                if (plugin.config.disableScore) {
                    $(_quizScore).remove()
                } else {
                    $(_quizScore + ' span').html(plugin.config.scoreTemplateText
                        .replace('%score', displayScore).replace('%total', questionCount));
                }
                
                var quizPercentage = (score / questionCount).toFixed(2)*100;
                
                $quizName.append('<div class="percentage"><div class="percentage-border"><div class="percentage-circle"><b>'
                                 + quizPercentage + "%" + 
                                 '</b></div></div></div>');
                
                if ( quizPercentage > 75 ) {
                    var inputHTML;
                    inputHTML = '<span class="certify-input certify-name input--filled">';
                        inputHTML += '<input class="certify-field field-style" type="text" id="certifyInput">';
                        inputHTML += '<label class="certify-label label-style orange-label" for="certifyInput">';
                            inputHTML += '<span class="certify-label-content label-content-style">';
                                inputHTML += 'Nombre Completo';
                            inputHTML += '</span>';
                        inputHTML += '</label>';
                    inputHTML += '</span>';
                    inputHTML += '<div class="get-certify">Obtener Certificado</div>';
                    $quizResults.append(inputHTML);
                    $('span.certify-input > input').blur(function() {
                      if( $(this).val() ) {
                        $(this).closest('span.certify-input').addClass('input--filled');
                      } else {
                        $(this).closest('span.certify-input').removeClass('input--filled');
                      }
                    });
                    $('.get-certify').on('click', function() {
                        var nameValidator = new RegExp(/^[A-Za-zÀ-ú\s]+$/);
                        var nameInput = $('span.certify-input > input').val();
                        if (nameInput != '' && nameValidator.test(nameInput)) {
                            console.log('input lleno y con nombres válidos');
                            var certify;
                            certify = '<div class="certify">';
                                certify += '<img src="http://i.imgur.com/v24ae6r.jpg">';
                                certify += '<span class="certify-username">';
                                    certify += nameInput;
                                certify += '</span>';
                                certify += '<span class="certify-percentage">';
                                    certify += quizPercentage;
                                certify += '</span>';
                                certify += '<div id="certifySharer" class="certify-sharer">';
                                    certify += '<i class="material-icons" style="margin-right: .25em;">&#xE80D;</i> Compartir en Facebook';
                                certify += '</div>';
                            certify += '</div>';
                            $quizResults.empty();
                            $quizResults.append(certify);
                            function createCertify() {
                                $quizResults.append('<canvas id="certifyCanvas" width="1000" height="1000"></canvas>');

                                // Canvas Object
                                var canvas = document.getElementById('certifyCanvas');
                                var ctx = canvas.getContext('2d');

                                // load image from data url
                                var width;
                                var height;
                                var imageObj = new Image();
                                imageObj.src = 'http://i.imgur.com/v24ae6r.jpg';
                                imageObj.onload = function() {
                                    width = parseInt(imageObj.width);
                                    height = parseInt(imageObj.height);
                                    ctx.drawImage(this, 0, 0, 1000, 1000);

                                    // common font attributes and text positioning 
                                    var y = 45 * width / 100;
                                    var x = 9.25 * width / 100;
                                    ctx.font = "50px Cinzel";
                                    ctx.fillStyle = '#2d190a';

                                    // apply multiple shadows
                                    // 1px 0px 1px #b1705c, -1px 0px 1px #8a5650, 0px 1px 1px #b5ab40
                                    ctx.shadowColor = '#b1705c';
                                    ctx.shadowBlur = 1;
                                    ctx.shadowOffsetX = 1;
                                    ctx.fillText('Glow', x, y);

                                    ctx.shadowColor = '#8a5650';
                                    ctx.shadowBlur = 1;
                                    ctx.shadowOffsetX = -1;
                                    ctx.fillText('Glow', x, y);

                                    ctx.shadowColor = '#b5ab40';
                                    ctx.shadowBlur = 1;
                                    ctx.shadowOffsetY = -1;
                                    ctx.fillText('Glow', x, y);

                                    // common font attributes and text positioning 
                                    var yP = 53.25 * width / 100;
                                    var xP = 36.25 * width / 100;
                                    ctx.font = "16px Cinzel";
                                    ctx.fillStyle = '#2d190a';
                                    ctx.shadowColor = '#b1705c';
                                    ctx.shadowBlur = 1;
                                    ctx.shadowOffsetY = -1;
                                    ctx.textAlign = "center";
                                    ctx.fillText("80%", xP, yP);
                                };
                            };

                            function dataURItoBlob(dataURI) {
                                var byteString = atob(dataURI.split(',')[1]);
                                var ab = new ArrayBuffer(byteString.length);
                                var ia = new Uint8Array(ab);
                                for (var i = 0; i < byteString.length; i++) {
                                    ia[i] = byteString.charCodeAt(i);
                                }
                                return new Blob([ab], {type: 'image/png'});
                            }

                            // FB SDK

                            window.fbAsyncInit = function() {
                                FB.init({
                                  appId      : '365482443812260',
                                  xfbml      : true,
                                  version    : 'v2.8'
                                });
                                FB.AppEvents.logPageView();
                            };

                            (function(d, s, id){
                                var js, fjs = d.getElementsByTagName(s)[0];
                                if (d.getElementById(id)) {return;}
                                js = d.createElement(s); js.id = id;
                                js.src = "//connect.facebook.net/en_US/sdk.js";
                                fjs.parentNode.insertBefore(js, fjs);
                            }(document, 'script', 'facebook-jssdk'));

                            $('#certifySharer').click(function () {
                                createCertify();
                                var data = $('#certifyCanvas')[0].toDataURL("image/png");
                                try {
                                    blob = dataURItoBlob(data);
                                } catch (e) {
                                    console.log(e);
                                }
                                FB.getLoginStatus(function (response) {
                                    console.log(response);
                                    if (response.status === "connected") {
                                        postImageToFacebook(response.authResponse.accessToken, "Canvas to Facebook/Twitter", "image/png", blob, window.location.href);
                                    } else if (response.status === "not_authorized") {
                                        FB.login(function (response) {
                                            postImageToFacebook(response.authResponse.accessToken, "Canvas to Facebook/Twitter", "image/png", blob, window.location.href);
                                        }, {scope: "publish_actions"});
                                    } else {
                                        FB.login(function (response) {
                                            postImageToFacebook(response.authResponse.accessToken, "Canvas to Facebook/Twitter", "image/png", blob, window.location.href);
                                        }, {scope: "publish_actions"});
                                    }
                                });
                            });

                            function postImageToFacebook(token, filename, mimeType, imageData, message) {
                                var fd = new FormData();
                                fd.append("access_token", token);
                                fd.append("source", imageData);
                                fd.append("no_story", true);
                                // Upload image to facebook without story(post to feed)
                                $.ajax({
                                    url: "https://graph.facebook.com/me/photos?access_token=" + token,
                                    type: "POST",
                                    data: fd,
                                    processData: false,
                                    contentType: false,
                                    cache: false,
                                    success: function (data) {
                                        console.log("success: ", data);
                                        // Get image source url
                                        FB.api(
                                            "/" + data.id + "?fields=images",
                                            function (response) {
                                                if (response && !response.error) {
                                                    //console.log(response.images[0].source);
                                                    // Create facebook post using image
                                                    FB.api(
                                                        "/me/feed",
                                                        "POST",
                                                        {
                                                            "message": "",
                                                            "picture": response.images[0].source,
                                                            "link": window.location.href,
                                                            "name": '¡Aprobé una prueba en Logos!',
                                                            "description": message,
                                                            "privacy": {
                                                                value: 'SELF'
                                                            }
                                                        },
                                                        function (response) {
                                                            if (response && !response.error) {
                                                                /* handle the result */
                                                                console.log("Posted story to facebook");
                                                                console.log(response);
                                                            }
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    },
                                    error: function (shr, status, data) {
                                        console.log("error " + data + " Status " + shr.status);
                                    },
                                    complete: function (data) {
                                        //console.log('Post to facebook Complete');
                                    }
                                });
                            }
                        };
                        if (nameInput != '' && nameValidator.test(nameInput) == false) {
                            console.log('input lleno pero con nombres no válidos');
                            $('#error-dialog').find('[name="error-message"]').text('por favor escribe un nombre válido, sin números.');
                            new DialogFx(document.getElementById('error-dialog')).toggle(this);
                        };
                        if (nameInput  == '') {
                            console.log('input vacio');
                            $('#error-dialog').find('[name="error-message"]').text('por favor llena tus datos.');
                            new DialogFx(document.getElementById('error-dialog')).toggle(this);
                        };
                    });
                }

                if (plugin.config.disableRanking) {
                    $(_quizLevel).remove()
                } else {
                    var levels    = [
                                        quizValues.info.level1, // 80-100%
                                        quizValues.info.level2, // 60-79%
                                        quizValues.info.level3, // 40-59%
                                        quizValues.info.level4, // 20-39%
                                        quizValues.info.level5  // 0-19%
                                    ],
                        levelRank = plugin.method.calculateLevel(score),
                        levelText = $.isNumeric(levelRank) ? levels[levelRank] : '';

                    $(_quizLevel + ' span').html(levelText);
                    $(_quizLevel).addClass('level' + levelRank);
                }

                $quizArea.fadeOut(300, function() {
                    // If response messaging is set to show upon quiz completion, show it now
                    if (plugin.config.completionResponseMessaging) {
                        $(_element + ' .button:not(' + _tryAgainBtn + '), ' + _element + ' ' + _questionCount).hide();
                        $(_element + ' ' + _question + ', ' + _element + ' ' + _answers + ', ' + _element + ' ' + _responses).show().css('display', 'block');
                        $quizResults.append($(_element + ' ' + _questions)).fadeIn(500, kN(key,1)).css('display', 'block');
                    } else {
                        $quizResults.fadeIn(500, kN(key,1)).css('display', 'block'); // 1st notch on key must be on both sides of if/else, otherwise key won't turn
                    }
                });

                internal.method.turnKeyAndGo (key, options && options.callback ? options.callback : function () {});

                if (plugin.config.events &&
                        plugin.config.events.onCompleteQuiz) {
                    plugin.config.events.onCompleteQuiz.apply (null, [{
                        questionCount: questionCount,
                        score: score
                    }]);
                }
            },

            // Compares selected responses with true answers, returns true if they match exactly
            compareAnswers: function(trueAnswers, selectedAnswers, selectAny) {
                if ( selectAny ) {
                    return $.inArray(selectedAnswers[0], trueAnswers) > -1;
                } else {
                    // crafty array comparison (http://stackoverflow.com/a/7726509)
                    return ($(trueAnswers).not(selectedAnswers).length === 0 && $(selectedAnswers).not(trueAnswers).length === 0);
                }
            },

            // Calculates knowledge level based on number of correct answers
            calculateLevel: function(correctAnswers) {
                var percent = (correctAnswers / questionCount).toFixed(2),
                    level   = null;

                if (plugin.method.inRange(0, 0.20, percent)) {
                    level = 4;
                } else if (plugin.method.inRange(0.21, 0.40, percent)) {
                    level = 3;
                } else if (plugin.method.inRange(0.41, 0.60, percent)) {
                    level = 2;
                } else if (plugin.method.inRange(0.61, 0.80, percent)) {
                    level = 1;
                } else if (plugin.method.inRange(0.81, 1.00, percent)) {
                    level = 0;
                }

                return level;
            },

            // Determines if percentage of correct values is within a level range
            inRange: function(start, end, value) {
                return (value >= start && value <= end);
            }
        };

        plugin.init = function() {
            // Setup quiz
            plugin.method.setupQuiz.apply (null, [{callback: plugin.config.animationCallbacks.setupQuiz}]);

            // Bind "start" button
            $quizStarter.on('click', function(e) {
                e.preventDefault();

                if (!this.disabled && !$(this).hasClass('disabled')) {
                    plugin.method.startQuiz.apply (null, [{callback: plugin.config.animationCallbacks.startQuiz}]);
                }
            });

            // Bind "try again" button
            $(_element + ' ' + _tryAgainBtn).on('click', function(e) {
                e.preventDefault();
                plugin.method.resetQuiz(this, {callback: plugin.config.animationCallbacks.resetQuiz});
            });

            // Bind "check answer" buttons
            $(_element + ' ' + _checkAnswerBtn).on('click', function(e) {
                e.preventDefault();
                plugin.method.checkAnswer(this, {callback: plugin.config.animationCallbacks.checkAnswer});
            });

            // Bind "back" buttons
            $(_element + ' ' + _prevQuestionBtn).on('click', function(e) {
                e.preventDefault();
                plugin.method.backToQuestion(this, {callback: plugin.config.animationCallbacks.backToQuestion});
            });

            // Bind "next" buttons
            $(_element + ' ' + _nextQuestionBtn).on('click', function(e) {
                e.preventDefault();
                plugin.method.nextQuestion(this, {callback: plugin.config.animationCallbacks.nextQuestion});
            });

            // Accessibility (WAI-ARIA).
            var _qnid = $element.attr('id') + '-name';
            $quizName.attr('id', _qnid);
            $element.attr({
              'aria-labelledby': _qnid,
              'aria-live': 'polite',
              'aria-relevant': 'additions',
              'role': 'form'
            });
            $(_quizStarter + ', [href = "#"]').attr('role', 'button');
        };

        plugin.init();
    };

    $.fn.slickQuiz = function(options) {
        return this.each(function() {
            if (undefined === $(this).data('slickQuiz')) {
                var plugin = new $.slickQuiz(this, options);
                $(this).data('slickQuiz', plugin);
            }
        });
    };
})(jQuery);
