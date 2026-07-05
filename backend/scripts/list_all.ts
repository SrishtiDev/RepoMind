import "dotenv/config";

async function main() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`;
  const response = await fetch(url);
  const data: any = await response.json();
  if (data && data.models) {
    console.log(data.models.map((m: any) => m.name));
  }
}
main();
