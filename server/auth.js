export function requireToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== process.env.API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}