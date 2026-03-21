import { config } from "./config";
import { app } from "./app";

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
