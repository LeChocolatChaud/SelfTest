import { parse, TokenType, Library } from "./parser.js";
import { getLang } from "./lang.js";

/* BEFORE USER ACTION */

const lang = getLang(navigator.language);

const storedLibs = localStorage.getItem("libraries");

export const libraries = storedLibs ? JSON.parse(storedLibs) : [];

try {
  // format the stored json raw data to make symbols work properly
  for (let i = 0; i < libraries.length; i++) {
    const lib = libraries[i];
    const obj = Library.from(lib);
    libraries[i] = obj;
  }
} catch (e) {
  // alert and clear stored libraries if failed to format
  console.error(e);
  alert(lang.translate("error-loading-libraries"));
  localStorage.removeItem("libraries");
  libraries.splice(0, libraries.length);
}

function getLibrary(libraryName, suppressWarning) {
  // get a saved library using its name
  const library = libraries.find((lib) => lib.name == libraryName);
  if (!library && !suppressWarning) {
    console.error(`Library with name ${libraryName} not found.`);
    alert(`${lang.translate("library-not-found")} (${libraryName})`);
    return null;
  }
  return library;
}

function buildLibraryOption(libraryName) {
  const option = document.createElement("option");
  option.innerText = libraryName;
  option.value = encodeURI(libraryName);
  return option;
}

function getBlankTokens(question, refLibrary) {
  let tokens = [];
  for (let token of question.tokens) {
    switch (token.type) {
      case TokenType.BLANK:
        tokens.push(token);
        break;
      case TokenType.REFERNCE:
        let refQuestion = refLibrary.questions.find(
          (q) => q.keyword === token.text
        );
        if (!refQuestion) return null;
        tokens.push(...getBlankTokens(refQuestion, refLibrary));
        break;
    }
  }
  return tokens;
}

function getAnswers(question, refLibrary) {
  return getBlankTokens(question, refLibrary).map((token) => token.text);
}

function getReferenceTokens(refQuestionName, refLibrary) {
  // get refed tokens using ref question name and the ref library
  const questions = refLibrary.questions;
  const refQuestion = questions.find(
    (question) => question.keyword === refQuestionName
  );
  if (!refQuestion) {
    console.error("Reference question not found: " + token.text);
    alert(`${lang.translate("reference_question_not_found")} (${token.text})`);
    return null;
  }
  const refSource = refQuestion.tokens.find(
    (t) => t.type === TokenType.REFERNCE_SOURCE
  );
  if (!refSource) return null; // well this can't happen unless something unusual happens... ref to class Question's constructor
  let refTokens = refQuestion.tokens.filter((t) => t.index > refSource.index);
  return refTokens;
}

$(function () {
  window.onbeforeunload = () => {
    // save the libraries in localStorage
    localStorage.setItem(
      "libraries",
      JSON.stringify(libraries, function (_key, value) {
        // symbol can't be stored by JSON, convert it to string format
        return typeof value === "symbol"
          ? value.toString().replace(/^Symbol\((.*)\)$/, 'Symbol("$1")')
          : value;
      })
    );
    localStorage.setItem("difficulty", $("#select-difficulty").val());
    localStorage.setItem("question_count", $("#question-count").val());
    localStorage.setItem(
      "dark_mode",
      $("body").hasClass("dark-mode") ? "true" : "false"
    );
  };

  if (localStorage.getItem("difficulty")) {
    $("#select-difficulty").val(localStorage.getItem("difficulty"));
  }

  // translate the DOM
  for (let i in lang) {
    let element = $(`#${i.replace(/_/g, "-")}`);
    if (!element.length) {
      element = $(`[key=${i.replace(/_/g, "-")}]`);
    }
    if (!element.length) {
      console.warn(
        `Element with translate key ${i} not found. Please check your lang file.`
      );
      continue;
    }

    if (localStorage.getItem("dark_mode") === "true") {
      $("body").addClass("dark-mode");
      $("h1").addClass("dark-mode");
    }

    if (localStorage.getItem("question_count")) {
      $("#question-count").val(localStorage.getItem("question_count"));
    }

    for (let j in lang[i]) {
      switch (j) {
        // text and html has their unique jq methods
        case "innerText":
          element.text(lang[i][j]);
          break;
        case "innerHTML":
          element.html(lang[i][j]);
          break;
        default:
          element.attr(j, lang[i][j]);
      }
    }
  }

  $("#submit-button").hide();
  $("#show-answer-button").hide();
  $("#hide-answer-button").hide();
  $("#library-info").hide();

  for (let i = 0; i < libraries.length; i++) {
    // load the libraries into select
    const library = libraries[i];
    const option = buildLibraryOption(library.name);
    $("#saved-libraries").append(option);
  }

  function render(libraryName) {
    // render a library into DOM

    // pre-render actions
    $("#questions-container").empty();
    if (libraryName === "") {
      $("#submit-button").hide();
      $("#show-answer-button").hide();
      $("#hide-answer-button").hide();
      $("#library-info").hide();
      return;
    }
    $("#library-info").show();
    $(".info-detail").remove();

    // get the library
    const library = getLibrary(libraryName);
    if (!library) return;

    // render library info
    for (let property in library) {
      if (property === "questions") continue;
      if (!library[property]) continue;
      let infoDiv = $(document.createElement("div"));
      infoDiv.addClass("info-detail");
      infoDiv.text(lang.translate("info_" + property) + library[property]);
      infoDiv.appendTo($("#library-info"));
    }

    // render questions (headache...)
    const questions = library.questions;
    const questionsShuffled = questions.sort(() => 0.5 - Math.random());
    const selectedQuestions = questionsShuffled
      .slice(0, $("#question-count").val())
      .map((q) => q.keyword);
    // used to show input placeholders
    // because placeholders can't be set until an input is visible in DOM
    const questionHints = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questionsShuffled[i];
      if (selectedQuestions.indexOf(question.keyword) === -1) continue;
      const questionDiv = $(document.createElement("div")); // the actual div element to show
      questionDiv.addClass("question");
      questionDiv.addClass("flex-row");
      questionDiv.append($('<span class="bullet">&#8226;&ensp;</span>'));
      const tokens = question.tokens.deepCopy(); // token system comes into use!

      // select the blanks to chop out based on the choosed difficulty
      let selectedBlanks;
      switch ($("#select-difficulty").val()) {
        case "half-blank":
          const blanks = getBlankTokens(question, library);
          const blanksShuffled = blanks.sort(() => 0.5 - Math.random());
          selectedBlanks = blanksShuffled
            .slice(0, blanks.length / 2)
            .map((blank) => blank.uuid);
          break;
        case "text-only":
          selectedBlanks = [];
          break;
        case "all-blank":
          selectedBlanks = getBlankTokens(question, library).map(
            (blank) => blank.uuid
          );
          break;
      }
      console.log(selectedBlanks);

      // render the tokens
      let blankIndex = 0;
      let hints = [];
      for (let j = 0; j < tokens.length; j++) {
        let token = tokens[j];
        let tokenElement;
        switch (token.type) {
          case TokenType.PLAIN_TEXT:
            tokenElement = $(document.createElement("span"));
            tokenElement.text(token.text);
            break;
          case TokenType.BLANK:
            console.log(token.uuid);
            if (selectedBlanks.indexOf(token.uuid) === -1) {
              tokenElement = $(document.createElement("span"));
              tokenElement.addClass("underlined");
              tokenElement.text(token.text.join("/"));
              blankIndex++;
              break;
            }
            tokenElement = $(document.createElement("input"));
            tokenElement.attr("type", "text");
            tokenElement.attr("id", `question-${i}-blank-${blankIndex}`);
            tokenElement.attr(
              "size",
              token.text
                .map((e) => e.length)
                .sort()
                .reverse()[0] + 2
            ); // (max length of possible answers) + 2
            tokenElement.addClass("blank");
            tokenElement.on("input", function () {
              // styling
              if ($(this).hasClass("correct")) {
                $(this).removeClass("correct");
              } else if ($(this).hasClass("wrong")) {
                $(this).removeClass("wrong");
              }
              $("#show-answer-button").hide();
              $("#hide-answer-button").hide();
              $(".correct-answer").remove();
            });
            break;
          case TokenType.BLANK_END:
            blankIndex++;
            break;
          case TokenType.HINT:
            hints[blankIndex] = token.text;
            break;
          case TokenType.REFERNCE:
            let additionalTokens = getReferenceTokens(token.text, library);
            if (!additionalTokens) return;
            let insertIndex =
              tokens
                .filter((t) => t.index > token.index)
                .find((t) => t.type === TokenType.REFERNCE_END).index + 1;
            tokens.splice(insertIndex, 0, ...additionalTokens);
            break;
        }
        if (tokenElement) tokenElement.appendTo(questionDiv);
      }
      questionDiv.appendTo($("#questions-container"));
      questionHints.push(hints);
    }

    // render placeholders
    for (let i = 0; i < questionHints.length; i++) {
      const qh = questionHints[i];
      for (let j = 0; j < qh.length; j++) {
        $(`input#question-${i}-blank-${j}`).attr("placeholder", qh[j]);
      }
    }

    $("#submit-button").show();
  }
  // phew, that's a lot of work

  function save(library) {
    // save a library object

    // find library with same name
    let sameName = getLibrary(library.name, true);
    if (sameName) {
      let replace = sameName.version <= library.version;
      if (!replace) {
        replace = confirm(
          lang.translate("confirm_version_1") +
            library.version +
            lang.translate("confirm_version_2") +
            library.version +
            lang.translate("confirm_version_3")
        );
      }
      if (!replace) return false;
      libraries[libraries.indexOf(sameName)] = library;
      $(
        "#saved-libraries option[value='" + encodeURI(library.name) + "']"
      ).remove();
    } else {
      libraries.push(library);
    }

    // build a new option while removing the old one
    const option = buildLibraryOption(library.name);
    $("#saved-libraries").append(option);
    $("#saved-libraries option[selected]").removeAttr("selected");
    $("#saved-libraries option:last").attr("selected", "selected");
    return true;
  }

  /* PRE-ANSWERING */

  // library source choices
  $("#get-button").on("click", function () {
    fetch($("#url-input").val())
      .then((res) => res.text())

      .then((text) => {
        let library = parse(text);
        let saveResult = save(library);
        if (saveResult) {
          render(library.name);
        }
      });
  });

  $("#upload-button").on("click", function () {
    let tempInput = document.createElement("input");
    tempInput.type = "file";
    tempInput.style.display = "none";

    tempInput.onchange = () => {
      let file = tempInput.files[0];
      let reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onloadend = () => {
        let library = parse(reader.result);
        let saveResult = save(library);
        if (saveResult) {
          render(library.name);
        }
      };
    };

    tempInput.click();
  });

  $("#saved-libraries").on("change", function () {
    render(decodeURI(this.value));
  });

  /* POST-ANSWERING */

  $("#submit-button").on("click", function () {
    const libName = decodeURI($("#saved-libraries").val());
    let library = getLibrary(libName);
    if (!library) return;

    const questions = library.questions;
    for (let i = 0; i < questions.length; i++) {
      const answers = getAnswers(questions[i], library);
      for (let j = 0; j < answers.length; j++) {
        const element = $(`input#question-${i}-blank-${j}`);
        if (!element) continue;
        if (answers[j].find((e) => e === element.val())) {
          element.addClass("correct");
        } else {
          element.addClass("wrong");
        }
      }
    }

    $(".correct-answer").remove();
    $("#show-answer-button").show();
    $("#hide-answer-button").hide();
  });

  $("#show-answer-button").on("click", function () {
    const libName = decodeURI($("#saved-libraries").val());
    let library = getLibrary(libName);
    if (!library) return;

    const questions = library.questions;
    for (let i = 0; i < questions.length; i++) {
      const answers = getAnswers(questions[i], library);
      for (let j = 0; j < answers.length; j++) {
        const element = $(`input#question-${i}-blank-${j}`);
        if (!element) continue;
        if (!answers.find((e) => e === element.val())) {
          const correctAnswerSpan = $(document.createElement("span"));
          correctAnswerSpan.addClass("correct-answer");
          correctAnswerSpan.text(answers[j].join("/"));
          element.after(correctAnswerSpan);
        }
      }
    }

    $("#show-answer-button").hide();
    $("#hide-answer-button").show();
  });

  $("#hide-answer-button").on("click", function () {
    $(".correct-answer").remove();
    $("#show-answer-button").show();
    $("#hide-answer-button").hide();
  });

  /* SIDE BAR */

  $("#open-side-bar-button").on("click", function () {
    // animation
    $("#side-bar").addClass("open");
    $(this).addClass("fade-out");
    if ($(this).hasClass("fade-in")) $(this).removeClass("fade-in");
    $(this).attr("disabled", true);
  });

  $("#close-side-bar-button").on("click", function () {
    // animation
    if ($("#side-bar").hasClass("open")) $("#side-bar").removeClass("open");
    $("#open-side-bar-button").addClass("fade-in");
    if ($("#open-side-bar-button").hasClass("fade-out"))
      $(this).removeClass("fade-out");
    $("#open-side-bar-button").attr("disabled", false);
  });

  $("#select-difficulty").on("change", function () {
    render(decodeURI($("#saved-libraries").val()));
  });

  $("#question-count").on("change", function () {
    render(decodeURI($("#saved-libraries").val()));
  });

  $("#dark-mode-button").on("click", function () {
    $("body").toggleClass("dark-mode");
    $("h1").toggleClass("dark-mode");
  });
});
