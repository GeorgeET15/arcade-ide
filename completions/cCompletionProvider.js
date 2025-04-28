define([], function () {
  function registerCCompletionProvider(monaco) {
    monaco.languages.registerCompletionItemProvider("c", {
      triggerCharacters: ["("],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: [
            // Standard Library Functions
            {
              label: "printf",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'printf(${1:"%s\\n"}, ${2:string})$0',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Print formatted output to stdout.\nParameters:\n- format: const char* (format string)\n- ...: additional arguments\nReturns: int (number of characters printed)",
              range: range,
            },
            {
              label: "scanf",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'scanf(${1:"%d"}, &${2:variable})$0',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Read formatted input from stdin.\nParameters:\n- format: const char* (format string)\n- ...: pointers to variables\nReturns: int (number of items assigned)",
              range: range,
            },
            {
              label: "malloc",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "malloc(${1:size})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Allocate memory dynamically.\nParameters:\n- size: size_t (bytes to allocate)\nReturns: void* (pointer to allocated memory)",
              range: range,
            },
            {
              label: "free",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "free(${1:ptr})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Free dynamically allocated memory.\nParameters:\n- ptr: void* (pointer to memory)",
              range: range,
            },
            {
              label: "strlen",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "strlen(${1:str})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Calculate the length of a string.\nParameters:\n- str: const char* (null-terminated string)\nReturns: size_t (length of string)",
              range: range,
            },
            {
              label: "strcpy",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "strcpy(${1:dest}, ${2:src})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Copy a string to a destination buffer.\nParameters:\n- dest: char* (destination buffer)\n- src: const char* (source string)\nReturns: char* (pointer to dest)",
              range: range,
            },
            {
              label: "strcmp",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "strcmp(${1:str1}, ${2:str2})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Compare two strings.\nParameters:\n- str1: const char*\n- str2: const char*\nReturns: int (0 if equal, <0 if str1<str2, >0 if str1>str2)",
              range: range,
            },
            {
              label: "rand",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "rand()$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Generate a random integer.\nReturns: int (random number in range [0, RAND_MAX])",
              range: range,
            },
            {
              label: "srand",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "srand(${1:seed})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Seed the random number generator.\nParameters:\n- seed: unsigned int",
              range: range,
            },
            {
              label: "exit",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "exit(${1|EXIT_SUCCESS,EXIT_FAILURE|})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Terminate the program.\nParameters:\n- status: int (e.g., EXIT_SUCCESS or EXIT_FAILURE)",
              range: range,
            },
            // C Keywords
            {
              label: "if",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "if (${1:condition}) {\n\t${2:/* code */}\n}$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Conditional statement.\nSyntax: if (condition) { /* code */ }",
              range: range,
            },
            {
              label: "for",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText:
                "for (${1:int i = 0}; ${2:i < count}; ${3:i++}) {\n\t${4:/* code */}\n}$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Loop construct.\nSyntax: for (init; condition; increment) { /* code */ }",
              range: range,
            },
            {
              label: "while",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "while (${1:condition}) {\n\t${2:/* code */}\n}$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Loop construct.\nSyntax: while (condition) { /* code */ }",
              range: range,
            },
            {
              label: "return",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "return ${1:value};$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Return a value from a function.\nSyntax: return value;",
              range: range,
            },
            {
              label: "struct",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "struct ${1:name} {\n\t${2:/* fields */}\n};$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Define a structure.\nSyntax: struct name { /* fields */ };",
              range: range,
            },
            // Common Structs
            {
              label: "Point",
              kind: monaco.languages.CompletionItemKind.Struct,
              insertText: "struct Point {\n\tint x;\n\tint y;\n};$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "A 2D point structure.\nFields:\n- x: int\n- y: int",
              range: range,
            },
            {
              label: "Rectangle",
              kind: monaco.languages.CompletionItemKind.Struct,
              insertText:
                "struct Rectangle {\n\tint x;\n\tint y;\n\tint width;\n\tint height;\n};$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "A rectangle structure.\nFields:\n- x: int\n- y: int\n- width: int\n- height: int",
              range: range,
            },
            // Common Constants
            {
              label: "NULL",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "NULL$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Null pointer constant.",
              range: range,
            },
            {
              label: "EXIT_SUCCESS",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "EXIT_SUCCESS$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Standard exit code for successful program termination (0).",
              range: range,
            },
            {
              label: "EXIT_FAILURE",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "EXIT_FAILURE$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Standard exit code for failed program termination (1).",
              range: range,
            },
          ],
        };
      },
    });
  }
  return { registerCCompletionProvider };
});
