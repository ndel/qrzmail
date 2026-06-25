fetch(process.env.SOGO_CONNECT_URL, {
  method: "POST",
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=utf-8",
  },
  body: JSON.stringify({
    userName: "codextest805469@qrzmail.com",
    password: "Testpass12345",
    rememberLogin: 0,
  }),
  redirect: "manual",
})
  .then(async (response) => {
    console.log("status", response.status);
    response.headers.forEach((value, key) => {
      if (key === "set-cookie" || key === "location") {
        console.log(key, value);
      }
    });
    console.log(await response.text());
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
