import { parse, TokenType, Library } from "./parser.js";
import { getLang } from "./lang.js";

const lang = getLang(navigator.language);

function translate(key) {
  if (!lang[key]) return "";
  if (!lang[key].text) return "";
  return lang[key].text;
}

let storedLibs = localStorage.getItem("libraries");

export const libraries = storedLibs ? JSON.parse(storedLibs) : [];

try {
  for (let i = 0; i < libraries.length; i++) {
    let lib = libraries[i];
    let obj = Library.from(lib);
    libraries[i] = obj;
  }
} catch (e) {
  console.error(e);
  localStorage.removeItem("libraries");
  libraries.splice(0, libraries.length);
}

window.onbeforeunload = () => {
  localStorage.setItem("libraries", JSON.stringify(libraries, function(_key, value) {
    return typeof value === "symbol" ? value.toString().replace(/^Symbol\((.*)\)$/, 'Symbol("$1")') : value;
  }));
};

$(function () {
  for (let i in lang) {
    let element = $(`#${i.replace(/_/g, "-")}`);
    if (!element.length) {
      element = $(`[key=${i.replace(/_/g, "-")}]`);
    }
    if (!element.length) continue;
    for (let j in lang[i]) {
      switch (j) {
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

  for (let i = 0; i < libraries.length; i++) {
    let library = libraries[i];
    let option = document.createElement("option");
    option.innerText = library.name;
    option.value = encodeURI(library.name);
    $("#saved-libraries").append(option);
  }

  function render(library_name) {
    $("#questions-container").empty();
    if (library_name === "") return;
    let library = libraries.find((library) => library.name === library_name);
    if (!library) {
      console.error(`There's no library named "${library_name}".`);
      return;
    }
    let questions = library.questions;
    let questionHints = [];
    for (let i = 0; i < questions.length; i++) {
      let question = questions[i];
      let questionDiv = $(document.createElement("div"));
      questionDiv.addClass("question");
      questionDiv.addClass("flex-row");
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
            tokenElement.attr("id", "blank-" + blankIndex);
            tokenElement.attr("size", question.answers[blankIndex].length + 2);
            tokenElement.addClass("blank");
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
            if (!refQuestion) return;
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
    for (let qh of questionHints) {
      for (let i = 0; i < qh.length; i++) {
        $("input#blank-" + i).attr("placeholder", qh[i]);
      }
    }
  }

  $("#saved-libraries").on("change", function () {
    render(decodeURI(this.value));
  });

  function save(library) {
    let sameName = libraries.find((library) => library.name === library.name);
    if (sameName) {
      let replace = sameName.version <= library.version;
      if (!replace) {
        replace = confirm(
          translate("confirm_version_1") +
            library.version +
            translate("confirm_version_2") +
            libraries[i].version +
            translate("confirm_version_3")
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
});
