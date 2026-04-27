/**
 * Zod validation middleware factory.
 * Validates request body, query, or params against a Zod schema.
 */
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiResponse } from "../utils/apiResponse";

type ValidationTarget = "body" | "query" | "params";

/**
 * Returns an Express middleware that validates the specified request
 * property against the given Zod schema.
 *
 * @example
 * router.post("/login", validate(loginSchema), controller.login);
 */
export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      ApiResponse.error(res, {
        statusCode: 422,
        message: "Validation failed",
        details,
      });
      return;
    }

    req[target] = result.data;
    next();
  };
}
