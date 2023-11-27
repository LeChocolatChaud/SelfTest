import { parse, TokenType, Library } from "./parser.js";
import { getLang } from "./lang.js";

const lang = getLang(navigator.language);

let storedLibs = localStorage.getItem("libraries");

const libraries = storedLibs ? JSON.parse(storedLibs) : [];

try {
  // format the stored json raw data to make symbols work properly
  for (let i = 0; i < libraries.length; i++) {
    let lib = libraries[i];
    let obj = Library.from(lib);
    libraries[i] = obj;
  }
} catch (e) {
  console.error(e);
  alert(lang.translate("error-loading-libraries"));
  localStorage.removeItem("libraries"); // clear stored libraries if failed to format
  libraries.splice(0, libraries.length);
}

window.onbeforeunload = () => {
  // save the libraries in memory
  localStorage.setItem(
    "libraries",
    JSON.stringify(libraries, function (_key, value) {
      // symbol can't be stored by JSON, convert it to string format
      return typeof value === "symbol"
        ? value.toString().replace(/^Symbol\((.*)\)$/, 'Symbol("$1")')
        : value;
    })
  );
};

$(function () {
  for (let i in lang) {
    // translate DOM
    let element = $(`#${i.replace(/_/g, "-")}`);
    if (!element.length) {
      element = $(`[key=${i.replace(/_/g, "-")}]`);
    }
    if (!element.length) continue;
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
    let library = libraries[i];
    let option = document.createElement("option");
    option.innerText = library.name;
    option.value = encodeURI(library.name);
    $("#saved-libraries").append(option);
  }

  function render(library_name) {
    // render a library into DOM
    $("#questions-container").empty();
    if (library_name === "") {
      $("#submit-button").hide();
      $("#show-answer-button").hide();
      $("#hide-answer-button").hide();
      $("#library-info").hide();
      return;
    }
    $("#library-info").show();
    $(".info-detail").remove();
    let library = libraries.find((library) => library.name === library_name);
    if (!library) {
      console.error(`There's no library named "${library_name}".`);
      return;
    }
    for (let property in library) {
      if (property === "questions") continue;
      if (!library[property]) continue;
      let infoDiv = $(document.createElement("div"));
      infoDiv.addClass("info-detail");
      infoDiv.text(lang.translate("info_" + property) + library[property]);
      infoDiv.appendTo($("#library-info"));
    }
    let questions = library.questions;
    let questionHints = [];
    for (let i = 0; i < questions.length; i++) {
      let question = questions[i];
      let questionDiv = $(document.createElement("div"));
      questionDiv.addClass("question");
      questionDiv.addClass("flex-row");
      questionDiv.append($('<span class="bullet">&#8226;&ensp;</span>'));
      let tokens = question.tokens;
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
            tokenElement = $(document.createElement("input"));
            tokenElement.attr("type", "text");
            tokenElement.attr("id", `question-${i}-blank-${blankIndex}`);
            tokenElement.attr(
              "size",
              question.answers[blankIndex]
                .map((e) => e.length)
                .sort()
                .reverse()[0] + 2
            );
            tokenElement.addClass("blank");
            tokenElement.on("input", function () {
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
            let refQuestion = questions.find(
              (question) => question.keyword === token.text
            );
            if (!refQuestion) {
              console.error("Reference question not found: " + token.text);
              alert(
                `${lang.translate("reference_question_not_found")} (${
                  token.text
                })`
              );
              return;
            }
            let refSource = refQuestion.tokens.find(
              (t) => t.type === TokenType.REFERNCE_SOURCE
            );
            if (!refSource) return;
            let addtionalTokens = refQuestion.tokens.filter(
              (t) => t.index > refSource.index
            );
            tokens.splice(j, 0, ...addtionalTokens);
            break;
        }
        if (tokenElement) tokenElement.appendTo(questionDiv);
      }
      questionDiv.appendTo($("#questions-container"));
      questionHints.push(hints);
    }
    for (let i = 0; i < questionHints.length; i++) {
      const qh = questionHints[i];
      for (let j = 0; j < qh.length; j++) {
        $(`input#question-${i}-blank-${j}`).attr("placeholder", qh[j]);
      }
    }
    $("#submit-button").show();
  }

  $("#saved-libraries").on("change", function () {
    render(decodeURI(this.value));
  });

  function save(library) {
    let sameName = libraries.find((lib) => lib.name === library.name);
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
    let option = document.createElement("option");
    option.innerText = library.name;
    option.value = encodeURI(library.name);
    $("#saved-libraries").append(option);
    $("#saved-libraries option[selected]").removeAttr("selected");
    $("#saved-libraries option:last").attr("selected", "selected");
    return true;
  }

  $("#get-button").on("click", function () {
    fetch($("#url-input").val())
      .then((res) => res.text())
      .then((text) => {
        let library = parse(text);
        let save_result = save(library);
        if (save_result) {
          render(library.name);
        }
      });
  });
  $("#upload-button").on("click", function () {
    let temp_input = document.createElement("input");
    temp_input.type = "file";
    temp_input.style.display = "none";
    temp_input.onchange = () => {
      let file = temp_input.files[0];
      let reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onloadend = () => {
        let library = parse(reader.result);
        console.log(library);
        let save_result = save(library);
        if (save_result) {
          render(library.name);
        }
      };
    };
    temp_input.click();
  });
  $("#submit-button").on("click", function () {
    const libName = decodeURI($("#saved-libraries").val());
    let library = libraries.find((lib) => lib.name == libName);
    if (!library) {
      console.error(`Library with name ${libName} not found.`);
      alert(`${lang.translate("library-not-found")} (${libName})`);
      return;
    }
    const questions = library.questions;
    for (let i = 0; i < questions.length; i++) {
      const answers = questions[i].answers;
      for (let j = 0; j < answers.length; j++) {
        const element = $(`input#question-${i}-blank-${j}`);
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
    let library = libraries.find((lib) => lib.name == libName);
    if (!library) {
      console.error(`Library with name ${libName} not found.`);
      alert(`${lang.translate("library-not-found")} (${libName})`);
      return;
    }
    const questions = library.questions;
    for (let i = 0; i < questions.length; i++) {
      const answers = questions[i].answers;
      for (let j = 0; j < answers.length; j++) {
        const element = $(`input#question-${i}-blank-${j}`);
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
  $("#open-side-bar-button").on("click", function () {
    $("#side-bar").addClass("open");
    $(this).addClass("fade-out");
    if ($(this).hasClass("fade-in")) $(this).removeClass("fade-in");
    $(this).attr("disabled", true);
  });
  $("#close-side-bar-button").on("click", function () {
    if ($("#side-bar").hasClass("open")) $("#side-bar").removeClass("open");
    $("#open-side-bar-button").addClass("fade-in");
    if ($("#open-side-bar-button").hasClass("fade-out"))
      $(this).removeClass("fade-out");
    $("#open-side-bar-button").attr("disabled", false);
  });
});
