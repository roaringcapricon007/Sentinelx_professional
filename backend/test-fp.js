async function testFP() {
    console.log("Testing forgot-password...");
    const email = 'kamaleshselvakumar007@gmail.com';
    const res = await fetch('http://127.0.0.1:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const data = await res.json();
    console.log("status:", res.status);
    console.log("data:", data);
}
testFP();
