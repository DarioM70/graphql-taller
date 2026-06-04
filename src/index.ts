import 'dotenv/config';
import { createApp } from './server';

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  const { app } = await createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 GraphQL API ready at http://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
