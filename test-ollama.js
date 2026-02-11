
async function test() {
    try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        console.log('127.0.0.1 status:', res.status);
        const data = await res.json();
        console.log('127.0.0.1 models:', data.models.length);
    } catch (e) {
        console.error('127.0.0.1 failed:', e.message);
    }

    try {
        const res = await fetch('http://localhost:11434/api/tags');
        console.log('localhost status:', res.status);
        const data = await res.json();
        console.log('localhost models:', data.models.length);
    } catch (e) {
        console.error('localhost failed:', e.message);
    }
}
test();
