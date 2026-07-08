require('dotenv').config();
async function run() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`);
    const data = await res.json();
    console.log(data.models.filter(m => m.name.includes('embed')).map(m => m.name));
  } catch (err) {
    console.error(err);
  }
}
run();
