class Library {
  constructor(name, questions) {
    this.name = name;
    this.questions = questions.sort((a, b) => a.index - b.index);
  }
}

class Question {
  constructor(tokens) {
    this.tokens = tokens;
    let keyword;
    this.keyword = (keyword = tokens.find((t) => t.type === TokenType.KEYWORD))
      ? keyword.text
      : undefined;
  }
}

const TokenType = Object.freeze({
  KEYWORD: 0,
  KEYWORD_START: 1,
  KEYWORD_END: 2,
  BLANK: 3,
  BLANK_START: 4,
  BLANK_END: 5,
  HINT: 6,
  HINT_START: 7,
  HINT_END: 8,
  REFERNCE: 9,
  REFERNCE_START: 10,
  REFERNCE_END: 11,
  PLAIN_TEXT: 12,
});

class Token {
  constructor(type, index, text) {
    this.type = type;
    this.index = index;
    if (text) {
      this.text = text;
    } else {
      switch (type) {
        case 1:
          this.text = "{";
          break;
        case 2:
          this.text = "}";
          break;
        case 4:
        case 5:
          this.text = "$";
          break;
        case 7:
        case 8:
          this.text = "%";
          break;
        case 10:
        case 11:
          this.text = "@";
          break;
        default:
          this.text = "";
      }
    }
  }
}

class ParseError extends Error {}

function findMatch(array, predicate) {
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i])) return array[i];
  }
  return null;
}

function parse(questions_text) {
  questions_text = questions_text.split("\n").map((e) => e.trim());
  let backward_index = 0;
  if (
    questions_text.indexOf("[config]") !==
    (backward_index =
      questions_text.length - questions_text.reverse().indexOf("[config]") - 1)
  ) {
    console.log(backward_index);
    console.log(questions_text.indexOf("[config]"));
    throw new ParseError(
      `There should be only one config section.\n>>> Error at line ${
        backward_index + 1
      }`
    );
  }
  if (questions_text.indexOf("[questions]") === -1) {
    throw new ParseError(
      "There should be at least a questions section.\n>>> Error at line 1"
    );
  }
  if (
    questions_text.indexOf("[questions]") !==
    (backward_index =
      questions_text.length -
      questions_text.reverse().indexOf("[questions]") -
      1)
  ) {
    throw new ParseError(
      `There should be only one questions section.\n>>> Error at line ${
        backward_index + 1
      }`
    );
  }
  let properties = {};
  let section = "";
  let format = 1; // no use for now
  let questions = [];
  for (let pointer = 0; pointer < questions_text.length; pointer++) {
    let line = questions_text[pointer];
    if (line === "") continue;
    if (line.startsWith("#")) continue;
    if (line === "[config]") {
      section = "config";
      continue;
    } else if (line === "[questions]") {
      section = "questions";
      continue;
    }
    switch (section) {
      case "config":
        if (line.indexOf("=") === -1) {
          throw new ParseError(
            `Config lines should be in format key=value.\n>>> Error at line ${pointer}, column 1.`
          );
        }
        let splitted = line.split("=");
        switch (splitted[0]) {
          case "name":
            properties.name = splitted[1];
            break;
          case "author":
            properties.author = splitted[1];
            break;
          case "description":
            properties.description = splitted[1];
            break;
          case "version":
            properties.version = parseInt(splitted[1]);
            if (isNaN(properties.version)) {
              throw new ParseError(
                `Version should be a number.\n>>> Error at line ${pointer}, column ${
                  splitted[0].length + 1
                }`
              );
            }
            break;
          case "format":
            format = parseInt(splitted[1]);
            if (isNaN(format)) {
              throw new ParseError(
                `Format should be a number.\n>>> Error at line ${pointer}, column ${
                  splitted[0].length + 1
                }`
              );
            }
            break;
          default:
            throw new ParseError(
              `Unknown config key.\n>>> Error at line ${pointer}, column 1`
            );
        }
        break;
      case "questions":
        let tokens = [];
        let findResult;
        let text = "";
        let textIndex = 0;
        let append = true;
        for (let i = 0; i < line.length; i++) {
          let char = line[i];
          switch (char) {
            case "{":
              if (line[i + 1] !== "^") {
                if (text !== "") {
                  tokens.push(new Token(TokenType.PLAIN_TEXT, textIndex, text));
                  text = "";
                }
                append = false;
              }
              tokens.push(new Token(TokenType.KEYWORD_START, i));
              break;
            case "}":
              tokens.push(new Token(TokenType.KEYWORD_END, i));
              if (
                (findResult = findMatch(
                  tokens.reverse(),
                  (t) => t.type == TokenType.KEYWORD_START
                ))
              ) {
                tokens.push(
                  new Token(
                    TokenType.KEYWORD,
                    findResult.index,
                    line.substring(findResult.index + 1, i)
                  )
                );
                append = true;
              } else {
                throw new ParseError(
                  `Unmatched close bracket.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              }
              break;
            case "$":
              if (
                (findResult = findMatch(
                  tokens.reverse(),
                  (t) => t.type == TokenType.BLANK_START
                ))
              ) {
                tokens.push(new Token(TokenType.BLANK_END, i));
                tokens.push(
                  new Token(
                    TokenType.BLANK,
                    findResult.index,
                    line.substring(findResult.index + 1, i).replace(/%.*%/g, "")
                  )
                );
                append = true;
                break;
              }
              if (line.indexOf("$", i + 1) === -1) {
                throw new ParseError(
                  `Unmatched close bracket.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              }
              tokens.push(new Token(TokenType.BLANK_START, i));
              append = false;
              if (text !== "") {
                tokens.push(new Token(TokenType.PLAIN_TEXT, i, text));
                text = "";
              }
              break;
            case "%":
              {
                let lastFoundStart = findMatch(
                  tokens.reverse(),
                  (t) => t.type == TokenType.BLANK_START
                );
                let lastFoundEnd = findMatch(
                  tokens.reverse(),
                  (t) => t.type == TokenType.BLANK_END
                );
                if (
                  !(
                    lastFoundStart &&
                    (!lastFoundEnd || lastFoundEnd.index < lastFoundStart.index)
                  )
                )
                  throw new ParseError("Hint not in a blank.");
              }
              if (
                (findResult = findMatch(
                  tokens.reverse(),
                  (t) => t.type == TokenType.HINT_START
                ))
              ) {
                tokens.push(new Token(TokenType.HINT_END, i));
                tokens.push(
                  new Token(
                    TokenType.HINT,
                    findResult.index,
                    line.substring(findResult.index + 1, i)
                  )
                );
                break;
              }
              if (line.indexOf("%", i + 1) === -1) {
                throw new ParseError(
                  `Unmatched close bracket.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              }
              tokens.push(new Token(TokenType.HINT_START, i));
              break;
            case "@":
              if (
                (findResult = findMatch(
                  tokens.reverse(),
                  (t) => t.type == TokenType.REFERNCE_START
                ))
              ) {
                tokens.push(new Token(TokenType.REFERNCE_END, i));
                tokens.push(
                  new Token(
                    TokenType.REFERNCE,
                    findResult.index,
                    line.substring(findResult.index + 1, i)
                  )
                );
                append = true;
                break;
              }
              if (line.indexOf("@", i + 1) === -1) {
                throw new ParseError(
                  `Unmatched close bracket.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              }
              tokens.push(new Token(TokenType.REFERNCE_START, i));
              append = false;
              if (text !== "") {
                tokens.push(new Token(TokenType.PLAIN_TEXT, i, text));
                text = "";
              }
              break;
            case "^": {
              let lastFoundStart = findMatch(
                tokens.reverse(),
                (t) => t.type == TokenType.KEYWORD_START
              );
              let lastFoundEnd = findMatch(
                tokens.reverse(),
                (t) => t.type == TokenType.KEYWORD_END
              );
              if (
                !(
                  lastFoundStart &&
                  (!lastFoundEnd || lastFoundEnd.index < lastFoundStart.index)
                )
              )
                break;
            }
            default:
              if (append) text += char;
          }
        }
        if (text !== "") {
          tokens.push(new Token(TokenType.PLAIN_TEXT, i, text));
          text = "";
        }
        questions.push(new Question(tokens));
        break;
      default:
        throw new ParseError(
          `A line must be in a section.\n>>> Error at line ${pointer}`
        );
    }
  }
  let library = new Library(
    properties.name ? properties.name : crypto.randomUUID(),
    questions
  );
  library.author = properties.author;
  library.description = properties.description;
  library.version = properties.version;
  return library;
}

export { Library, Question, TokenType, Token, ParseError, parse };
