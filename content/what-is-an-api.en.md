## Imagine you're in a restaurant

You (**the app**) want food from the kitchen (**the server**). You don't walk into the kitchen yourself — you ask the **waiter**. The waiter is the **API**: they carry your request in an agreed format and bring back the result.

## Definition

An API (Application Programming Interface) is a set of rules that lets two programs talk to each other.

## A real example

This code requests data from an API and prints the result:

```js
const res = await fetch('https://api.github.com/users/octocat');
const user = await res.json();
console.log(user.name, user.public_repos);
```

## Common request methods

| Method | Use |
|---|---|
| `GET` | Read data |
| `POST` | Create data |
| `PUT` / `PATCH` | Update data |
| `DELETE` | Delete data |

Once you understand APIs, you understand how most modern apps talk to each other.