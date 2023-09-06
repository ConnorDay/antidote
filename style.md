# Classes/ Types/ Interfaces
Classes or types should use Pascal case.

Interfaces are preferred and should have a semicolon after every type listed
```typescript
interface TestType {
    key: any;
}

class TestClass {

}
```
# Functions
Functions names should use camel case. 
The opening parenthesis should be touching the function name and should have a space before the first parameter (unless there are no parameters then the opening parenthesis should immediately be followed by the closing counter part).
The opening curly bracket should be on the same line as the function definition, one space after the closing parenthesis. The closing bracket should be on a new line after the function definition at the same indentation level.

If the function returns anything other than void, include that in the function definition. The `:` should be touching the closing parenthesis and the type should have a space between the colon and opening bracket.

Functions should be documented with JSDoc comments. Functions should have a single sentence describing what it's purpose is, as well as a simple description of each parameter should be.
If the function returns anything, include a brief description of what is getting returned.
Since we're writing this in typescript including the types in these comments is redundant and not needed.
```typescript
/**
 * A function that is supposed to demonstrate syntax
 */
function fooBar() {
    /* code */
}

/**
 * A function that shows how to handle parameters.
 * @param param1 the first parameter.
 * @param param2 the second parameter.
 */
function otherFunctionButLonger( param1: any, param2: string ): string {
    /* more code */
}
```
# Variables
## General
General variables should use snake case.
```typescript
let test_variable = "whatever";
```
## Constants
A constant does not mean any variable that uses `const` as it's definition, it means any variable that is defined to be used in place of a literal. Constants should be defined in all capital letters.
```typescript
const SOCKET = 8000;
```