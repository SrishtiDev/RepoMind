import "dotenv/config";

async function main() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`;
  const response = await fetch(url);
  const data: any = await response.json();
  if (data && data.models) {
    const embeddings = data.models.filter((m: any) => m.name.includes("embed"));
    console.log(embeddings.map((m: any) => m.name));
  } else {
    console.log(data);
  }
}
main();
