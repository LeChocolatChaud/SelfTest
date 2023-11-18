import { parse } from "./parser.js";
import { ZH_CN } from "./lang.js";

if (navigator.language === "zh-CN") {
  for (let i in ZH_CN) {
    let element = document.getElementById(i.replace(/_/g, "-"));
		if (element.tagName === "INPUT") {
			element.placeholder = ZH_CN[i];
		} else {
			element.innerText = ZH_CN[i];
		}
  }
}

const libraries = JSON.parse(localStorage.getItem("libraries"));

window.onbeforeunload = () => {
	localStorage.setItem("libraries", JSON.stringify(libraries));
}

$(function () {
	function render(library) {
		let questions = library.questions;
	}

	$("#get-button").on("click", function() {
		fetch($("#url-input").val())
		.then(res => res.text())
		.then(text => {
			let library = parse(text);
			render(library);
		});
	})
  $("#upload-button").on("click", function() {
    let temp_input = document.createElement("input");
    temp_input.type = "file";
    temp_input.style.display = "none";
    temp_input.onchange = () => {
      let file = temp_input.files[0];
      let reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onloadend = () => {
        let library = parse(reader.result);
        render(library);
      };
    };
    temp_input.click();
  });
});
