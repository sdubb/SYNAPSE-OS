import { Router } from 'express';

export const teamsRouter = Router();

// Teams are not yet persisted in the database schema.
// These endpoints return placeholder responses until a `teams` table is added.

teamsRouter.get('/', (_req, res) => {
  res.json([]);
});

teamsRouter.post('/', (_req, res) => {
  // Teams table does not exist yet — return 501 until schema is extended
  res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'Teams persistence is not yet implemented. Add a `teams` table to the database schema.',
  });
});
