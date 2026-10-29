export default async function () { return new Response("Not available", { status: 404, headers: { "Cache-Control": "no-store" } }); }
