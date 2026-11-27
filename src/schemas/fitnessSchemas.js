const { z } = require("zod");

/**
 * Fitness Coaching App - Zod Validation Schemas
 * Entities: Workout Plans and Progress Analytics
 */

// Allowed goals and difficulty levels
const TARGET_GOALS = [
  "fat_loss",
  "muscle_hypertrophy",
  "strength_power",
  "endurance",
  "mobility",
];
const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"];

/**
 * Exercise sub-schema for a workout plan
 */
const planExerciseSchema = z.object({
  name: z
    .string({ required_error: "Exercise name is required" })
    .trim()
    .min(2, "Exercise name must be at least 2 characters")
    .max(80, "Exercise name cannot exceed 80 characters"),
  sets: z
    .number({ required_error: "Number of sets is required" })
    .int("Sets must be a whole integer")
    .min(1, "At least 1 set is required")
    .max(20, "Sets cannot exceed 20 per exercise"),
  targetReps: z
    .number({ required_error: "Target reps is required" })
    .int("Target reps must be a whole integer")
    .min(1, "At least 1 rep is required")
    .max(100, "Target reps cannot exceed 100"),
  targetRpe: z
    .number({ required_error: "Target RPE is required" })
    .min(1.0, "RPE (Rating of Perceived Exertion) minimum is 1.0")
    .max(10.0, "RPE maximum is 10.0 (maximum voluntary exertion)"),
  restSeconds: z
    .number()
    .int("Rest interval must be whole seconds")
    .min(0, "Rest interval cannot be negative")
    .max(600, "Rest interval cannot exceed 600 seconds (10 minutes)")
    .default(90),
  targetWeightKg: z
    .number()
    .min(0, "Target weight cannot be negative")
    .max(500, "Target weight exceeds maximum safety limit (500 kg)")
    .optional(),
});

/**
 * POST /api/v1/fitness/workout-plans
 * Validates workout plan creation by coach for a client
 */
const createWorkoutPlanSchema = z
  .object({
    clientId: z
      .string({ required_error: "clientId is required" })
      .trim()
      .min(3, "clientId must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "clientId contains invalid characters"),
    coachId: z
      .string({ required_error: "coachId is required" })
      .trim()
      .min(3, "coachId must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "coachId contains invalid characters"),
    planName: z
      .string({ required_error: "planName is required" })
      .trim()
      .min(3, "planName must be at least 3 characters")
      .max(100, "planName cannot exceed 100 characters"),
    targetGoal: z.enum(TARGET_GOALS, {
      errorMap: () => ({
        message: `targetGoal must be one of: ${TARGET_GOALS.join(", ")}`,
      }),
    }),
    difficulty: z.enum(DIFFICULTY_LEVELS, {
      errorMap: () => ({
        message: `difficulty must be one of: ${DIFFICULTY_LEVELS.join(", ")}`,
      }),
    }),
    scheduleDaysPerWeek: z
      .number({ required_error: "scheduleDaysPerWeek is required" })
      .int("scheduleDaysPerWeek must be an integer")
      .min(1, "Schedule must be at least 1 day per week")
      .max(7, "Schedule cannot exceed 7 days per week"),
    exercises: z
      .array(planExerciseSchema, {
        required_error: "exercises array is required",
      })
      .min(1, "Workout plan must include at least 1 exercise")
      .max(25, "Workout plan cannot exceed 25 exercises"),
  })
  .superRefine((data, ctx) => {
    // -------------------------------------------------------------------------
    // DOMAIN EDGE CASE 1: Duplicate Exercise Routine Collision
    // An individual plan cannot list the same exercise twice; sets must be combined.
    // -------------------------------------------------------------------------
    const seenNames = new Set();
    data.exercises.forEach((ex, idx) => {
      const normalized = ex.name.toLowerCase().trim();
      if (seenNames.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate exercise '${ex.name}' detected in workout plan. Aggregate sets into a single exercise entry.`,
          path: ["exercises", idx, "name"],
        });
      }
      seenNames.add(normalized);

      // -----------------------------------------------------------------------
      // DOMAIN EDGE CASE 2: Physiological Safety Rule (Max RPE with 0 Rest)
      // Near-maximal exertion (RPE >= 9.5) cannot have 0 seconds rest.
      // -----------------------------------------------------------------------
      if (ex.targetRpe >= 9.5 && ex.restSeconds === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Near-maximal exertion (RPE >= 9.5) requires a minimum rest interval of 60 seconds.",
          path: ["exercises", idx, "restSeconds"],
        });
      }
    });
  });

/**
 * Exercise sub-schema for a completed workout log
 */
const completedExerciseSchema = z.object({
  name: z
    .string({ required_error: "Exercise name is required" })
    .trim()
    .min(2, "Exercise name must be at least 2 characters"),
  setsCompleted: z
    .number({ required_error: "setsCompleted is required" })
    .int("setsCompleted must be an integer")
    .min(1, "Must complete at least 1 set")
    .max(20, "setsCompleted cannot exceed 20"),
  repsCompleted: z
    .number({ required_error: "repsCompleted is required" })
    .int("repsCompleted must be an integer")
    .min(1, "Must complete at least 1 rep")
    .max(100, "repsCompleted cannot exceed 100"),
  weightKg: z
    .number({ required_error: "weightKg is required" })
    .min(0, "weightKg cannot be negative (0 for bodyweight exercises)")
    .max(500, "weightKg cannot exceed 500 kg"),
});

/**
 * POST /api/v1/fitness/progress-logs
 * Validates progress telemetry and session analytics submitted by client or coach
 */
const logProgressSchema = z
  .object({
    clientId: z
      .string({ required_error: "clientId is required" })
      .trim()
      .min(3, "clientId must be at least 3 characters"),
    planId: z
      .string({ required_error: "planId is required" })
      .trim()
      .min(3, "planId must be at least 3 characters"),
    sessionDate: z
      .string({ required_error: "sessionDate is required" })
      .datetime({ message: "sessionDate must be a valid ISO 8601 date-time string" }),
    durationMinutes: z
      .number({ required_error: "durationMinutes is required" })
      .int("durationMinutes must be an integer")
      .min(5, "Workout duration must be at least 5 minutes")
      .max(360, "Workout duration cannot exceed 360 minutes (6 hours)"),
    perceivedRpe: z
      .number({ required_error: "perceivedRpe is required" })
      .min(1.0, "perceivedRpe minimum is 1.0")
      .max(10.0, "perceivedRpe maximum is 10.0"),
    completedExercises: z
      .array(completedExerciseSchema, {
        required_error: "completedExercises array is required",
      })
      .min(1, "Workout log must include at least 1 completed exercise")
      .max(25, "Completed exercises cannot exceed 25"),
    caloriesBurned: z
      .number()
      .int("caloriesBurned must be an integer")
      .min(0, "caloriesBurned cannot be negative")
      .max(5000, "caloriesBurned exceeds maximum threshold")
      .optional(),
    bodyWeightKg: z
      .number()
      .min(30, "bodyWeightKg must be at least 30 kg")
      .max(350, "bodyWeightKg cannot exceed 350 kg")
      .optional(),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  })
  .superRefine((data, ctx) => {
    // -------------------------------------------------------------------------
    // PRIMARY EDGE CASE: Temporal Causality Violation (Future Date Rejection)
    // Progress analytics represents historical achievement. Recording an event
    // in the future corrupts progressive overload charts, streaks, and recovery
    // readiness scores.
    // -------------------------------------------------------------------------
    const parsedDate = new Date(data.sessionDate);
    const now = new Date();
    // Allow slight tolerance of 5 minutes for client clock drift
    const maxAllowedFutureTime = now.getTime() + 5 * 60 * 1000;

    if (parsedDate.getTime() > maxAllowedFutureTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "sessionDate cannot be in the future. Cannot record progress analytics for an uncompleted future workout.",
        path: ["sessionDate"],
      });
    }
  });

/**
 * GET /api/v1/fitness/analytics/:clientId
 * Validates analytics query parameters and route parameters
 */
const getAnalyticsParamsSchema = z.object({
  clientId: z.string().trim().min(3, "clientId must be at least 3 characters"),
});

const getAnalyticsQuerySchema = z.object({
  timeframe: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
  metric: z.enum(["volume_load", "duration", "rpe", "frequency"]).default("volume_load"),
});

module.exports = {
  createWorkoutPlanSchema,
  logProgressSchema,
  getAnalyticsParamsSchema,
  getAnalyticsQuerySchema,
  TARGET_GOALS,
  DIFFICULTY_LEVELS,
};
