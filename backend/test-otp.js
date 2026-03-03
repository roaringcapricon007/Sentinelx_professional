async function test() {
    console.log("sending request...");
    const res = await fetch('http://127.0.0.1:3000/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Kamalesh", email: "kamaleshselvakumar007@gmail.com", password: "somepassword123!" })
    });

    console.log("status:", res.status);
    const data = await res.json();
    console.log("data:", data);
}
test();
