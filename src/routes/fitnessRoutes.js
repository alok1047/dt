const express = require("express");
const crypto = require("crypto");
const validate = require("../middlewares/validate");
const {
  createWorkoutPlanSchema,
  logProgressSchema,
  getAnalyticsParamsSchema,
  getAnalyticsQuerySchema,
} = require("../schemas/fitnessSchemas");
const { NotFoundError } = require("../errors/AppError");

const router = express.Router();

// In-memory data repositories (for prototyping and demonstration)
const workoutPlans = new Map();
const progressLogs = [];

/**
 * Helper: Reset in-memory data (useful for test isolations)
 */
function resetFitnessData() {
  workoutPlans.clear();
  progressLogs.length = 0;
}

/**
 * POST /api/v1/fitness/workout-plans
 * Prototype endpoint: Create a validated workout plan
 */
router.post(
  "/workout-plans",
  validate({ body: createWorkoutPlanSchema }),
  (req, res, next) => {
    try {
      const planData = req.body;
      const planId = `plan_${crypto.randomUUID()}`;

      // Calculate planned training volume metric
      const totalPlannedSets = planData.exercises.reduce((sum, ex) => sum + ex.sets, 0);
      const estimatedDurationMinutes = planData.exercises.reduce(
        (sum, ex) => sum + ex.sets * ((ex.targetReps * 4 + ex.restSeconds) / 60),
        10 // 10 min warm-up buffer
      );

      const createdPlan = {
        planId,
        ...planData,
        analytics: {
          totalPlannedSets,
          estimatedDurationMinutes: Math.round(estimatedDurationMinutes),
        },
        createdAt: new Date().toISOString(),
      };

      workoutPlans.set(planId, createdPlan);

      res.status(201).json({
        success: true,
        data: createdPlan,
        meta: {
          requestId: req.id,
          message: "Workout plan created and validated successfully",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/fitness/progress-logs
 * Prototype endpoint: Log completed workout session & compute progress analytics
 */
router.post(
  "/progress-logs",
  validate({ body: logProgressSchema }),
  (req, res, next) => {
    try {
      const logData = req.body;
      const logId = `log_${crypto.randomUUID()}`;

      // Calculate progressive overload analytics
      // Volume Load (kg) = Sum(sets * reps * weightKg)
      const totalVolumeLoadKg = logData.completedExercises.reduce(
        (total, ex) => total + ex.setsCompleted * ex.repsCompleted * ex.weightKg,
        0
      );

      // Training Strain / Exertion Index = (Duration in min) * (RPE / 10)
      const trainingStrainIndex = Number(
        (logData.durationMinutes * (logData.perceivedRpe / 10)).toFixed(1)
      );

      const progressEntry = {
        logId,
        ...logData,
        computedAnalytics: {
          totalVolumeLoadKg,
          trainingStrainIndex,
          estimatedEnergyExpenditureKcal:
            logData.caloriesBurned || Math.round(logData.durationMinutes * 7.5),
        },
        loggedAt: new Date().toISOString(),
      };

      progressLogs.push(progressEntry);

      res.status(201).json({
        success: true,
        data: progressEntry,
        meta: {
          requestId: req.id,
          message: "Workout session progress recorded and analyzed successfully",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/fitness/analytics/:clientId
 * Prototype endpoint: Retrieve aggregated progress analytics for a client
 */
router.get(
  "/analytics/:clientId",
  validate({ params: getAnalyticsParamsSchema, query: getAnalyticsQuerySchema }),
  (req, res, next) => {
    try {
      const { clientId } = req.params;
      const { timeframe, metric } = req.query;

      const clientLogs = progressLogs.filter((log) => log.clientId === clientId);

      const totalSessions = clientLogs.length;
      const totalVolumeLoad = clientLogs.reduce(
        (sum, log) => sum + (log.computedAnalytics?.totalVolumeLoadKg || 0),
        0
      );
      const averageRpe =
        totalSessions > 0
          ? Number(
              (
                clientLogs.reduce((sum, log) => sum + log.perceivedRpe, 0) / totalSessions
              ).toFixed(1)
            )
          : 0;

      res.json({
        success: true,
        data: {
          clientId,
          timeframe,
          metric,
          summary: {
            totalSessionsCompleted: totalSessions,
            totalVolumeLoadKg: totalVolumeLoad,
            averagePerceivedRpe: averageRpe,
          },
          recentSessions: clientLogs.slice(-5),
        },
        meta: {
          requestId: req.id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = {
  router,
  resetFitnessData,
  workoutPlans,
  progressLogs,
};
