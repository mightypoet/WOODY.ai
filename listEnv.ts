import dotenv from "dotenv";
dotenv.config();

console.log("envs:");
console.log(process.env.VITE_SUPABASE_URL);
console.log(process.env.VITE_SUPABASE_ANON_KEY?.slice(0,10));
