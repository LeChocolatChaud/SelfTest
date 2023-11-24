class Library {
  constructor(name, questions) {
    this.name = name;
    this.questions = questions;
  }

  static from(obj) {
    if (typeof obj === "string") obj = JSON.parse(obj);
    if (typeof obj !== "object") throw TypeError("The parameter must be a library-like object.");
    if (!obj.name || !obj.questions) throw TypeError("The library must have a name and questions.");
    if (obj instanceof Library) return obj;
    let parsed_questions = obj.questions.map((q) => Question.from(q));
    return new Library(obj.name, parsed_questions);
  }
}

class Question {
  constructor(tokens) {
    this.tokens = tokens.sort((a, b) => a.index - b.index);
    let keyword;
    this.keyword = (keyword = tokens.find((t) => t.type === TokenType.KEYWORD))
      ? keyword.text
      : undefined;
    this.answers = this.tokens
      .filter((t) => t.type === TokenType.BLANK)
      .map((t) => t.text);
  }

  static from(obj) {
    if (typeof obj === "string") obj = JSON.parse(obj);
    if (typeof obj !== "object") throw TypeError("The parameter must be a question-like object.");
    if (!obj.tokens) throw TypeError("The question must have tokens.");
    if (obj instanceof Question) return obj;
    return new Question(obj.tokens.map((t) => Token.from(t)));
  }
}

class TokenType {
  static #isInternalConstructing = false;

  static KEYWORD = TokenType.#create("Keyword");
  static KEYWORD_START = TokenType.#create("KeywordStart");
  static KEYWORD_END = TokenType.#create("KeywordEnd");
  static BLANK = TokenType.#create("Blank");
  static BLANK_START = TokenType.#create("BlankStart");
  static BLANK_END = TokenType.#create("BlankEnd");
  static HINT = TokenType.#create("Hint");
  static HINT_START = TokenType.#create("HintStart");
  static REFERNCE = TokenType.#create("Reference");
  static REFERNCE_START = TokenType.#create("ReferenceStart");
  static REFERNCE_END = TokenType.#create("ReferenceEnd");
  static REFERNCE_SOURCE = TokenType.#create("ReferenceSource");
  static PLAIN_TEXT = TokenType.#create("PlainText");

  constructor(value) {
    if (!TokenType.#isInternalConstructing) {
      throw new TypeError("TokenType is not constructable");
    }
    TokenType.#isInternalConstructing = false;
    this.value = value instanceof Symbol ? value : Symbol(value);
  }

  static #create(value) {
    TokenType.#isInternalConstructing = true;
    const instance = new TokenType(value);
    return instance;
  }

  static valueOf(value) {
    switch (typeof value) {
      case "symbol":
        for (let obj of Object.values(TokenType)) {
          if (!obj instanceof TokenType) continue;
          if (obj.value.description === value.description) return obj;
        }
        break;
      case "object":
        if (value instanceof TokenType) return value;
        if (!value) return null;
        if (!value.value) return null;
        return TokenType.valueOf(value.value);
      case "string":
        return TokenType.valueOf(eval(value));
    }
    return null;
  }
}

class Token {
  constructor(type, index, text) {
    this.type = type;
    this.index = index;
    if (text) {
      this.text = text;
    } else {
      switch (type) {
        case TokenType.KEYWORD_START:
          this.text = "{";
          break;
        case TokenType.KEYWORD_END:
          this.text = "}";
          break;
        case TokenType.BLANK_START:
        case TokenType.BLANK_END:
          this.text = "$";
          break;
        case TokenType.HINT_START:
          this.text = "%";
          break;
        case TokenType.REFERNCE_START:
        case TokenType.REFERNCE_END:
          this.text = "@";
          break;
        case TokenType.REFERNCE_SOURCE:
          this.text = "|";
          break;
        default:
          this.text = "";
      }
    }
  }

  static from(obj) {
    if (typeof obj === "string") obj = JSON.parse(obj);
    if (typeof obj !== "object") throw TypeError("The parameter must be a token-like object.");
    if (!obj.type || obj.index === undefined || !obj.text) throw TypeError("The token must have type, index and text.");
    if (obj instanceof Token) return obj;
    return new Token(TokenType.valueOf(obj.type), obj.index, obj.text);
  }
}

class ParseError extends Error {}

function parse(questions_text) {
  questions_text = questions_text.split("\n").map((e) => e.trim());
  let backward_index = 0;
  if (
    questions_text.indexOf("[config]") !==
    (backward_index =
      questions_text.length - questions_text.reverse().indexOf("[config]") - 1)
  ) {
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
        let findResultStart;
        let findResultEnd;
        let findResultStart2;
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
              if (line.indexOf("}", i + 1) === -1)
                throw new ParseError(
                  `Missing closing bracket.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              tokens.push(new Token(TokenType.KEYWORD_START, i));
              break;
            case "}":
              tokens.push(new Token(TokenType.KEYWORD_END, i));
              if (
                (findResultStart = tokens
                  .reverse()
                  .find((t) => t.type == TokenType.KEYWORD_START))
              ) {
                tokens.push(
                  new Token(
                    TokenType.KEYWORD,
                    findResultStart.index + 1,
                    line.substring(findResultStart.index + 1, i)
                  )
                );
                append = true;
                textIndex = i + 1;
              } else {
                throw new ParseError(
                  `Unmatched close bracket.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              }
              break;
            case "$":
              findResultStart = tokens
                .reverse()
                .find((t) => t.type == TokenType.BLANK_START);
              findResultEnd = tokens
                .reverse()
                .find((t) => t.type == TokenType.BLANK_END);
              if (
                findResultStart &&
                (!findResultEnd || findResultEnd.index < findResultStart.index)
              ) {
                let blank = line
                  .substring(findResultStart.index + 1, i)
                  .split("%");

                tokens.push(new Token(TokenType.BLANK_END, i));
                tokens.push(
                  new Token(TokenType.BLANK, findResultStart.index + 1, blank[0])
                );
                if (blank.length > 1) {
                  let hintStart = tokens
                    .reverse()
                    .find((t) => t.type == TokenType.HINT_START).index;
                  tokens.push(
                    new Token(TokenType.HINT, hintStart + 1, blank[1])
                  );
                }
                append = true;
                textIndex = i + 1;
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
                tokens.push(new Token(TokenType.PLAIN_TEXT, textIndex, text));
                text = "";
              }
              break;
            case "%":
              findResultStart = tokens.find(
                (t) => t.type == TokenType.BLANK_START
              );
              findResultEnd = tokens.find((t) => t.type == TokenType.BLANK_END);
              findResultStart2 = tokens.find(
                (t) => t.type == TokenType.HINT_START
              );
              if (
                !(
                  findResultStart &&
                  (!findResultEnd ||
                    findResultEnd.index < findResultStart.index)
                )
              )
                throw new ParseError(
                  `Hint not in a blank.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              if (
                findResultStart2 &&
                findResultStart2.index > findResultStart.index
              )
                throw new ParseError(
                  `There should only be one hint sign per blank.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              tokens.push(new Token(TokenType.HINT_START, i));
              break;
            case "@":
              findResultStart = tokens
                .reverse()
                .find((t) => t.type == TokenType.REFERNCE_START);
              findResultEnd = tokens
                .reverse()
                .find((t) => t.type == TokenType.REFERNCE_END);
              if (
                findResultStart &&
                (!findResultEnd || findResultEnd.index < findResultStart.index)
              ) {
                tokens.push(new Token(TokenType.REFERNCE_END, i));
                tokens.push(
                  new Token(
                    TokenType.REFERNCE,
                    findResultStart.index + 1,
                    line.substring(findResultStart.index + 1, i)
                  )
                );
                append = true;
                textIndex = i + 1;
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
            case "|":
              if (tokens.find((t) => t.type == TokenType.REFERNCE_SOURCE))
                throw new ParseError(
                  `There shouldn't be two reference sources in one question.\n>>> Error at line ${pointer}, column ${
                    i + 1
                  }`
                );
              tokens.push(new Token(TokenType.REFERNCE_SOURCE, i));
              break;
            case "^": {
              findResultStart = tokens
                .reverse()
                .find((t) => t.type == TokenType.KEYWORD_START);
              findResultEnd = tokens
                .reverse()
                .find((t) => t.type == TokenType.KEYWORD_END);
              if (
                !(
                  findResultStart &&
                  (!findResultEnd ||
                    findResultEnd.index < findResultStart.index)
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
  if (!properties.name) throw new ParseError("A library must have a name.");
  let library = new Library(properties.name, questions);
  library.author = properties.author;
  library.description = properties.description;
  library.version = properties.version;
  return library;
}

export { Library, Question, TokenType, Token, ParseError, parse };
