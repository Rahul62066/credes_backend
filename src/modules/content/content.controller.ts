/**
 * Content module — Controller layer.
 */
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { contentService, ContentService } from "./content.service";
import type { GenerateContentInput } from "./content.validation";

export class ContentController {
  constructor(private service: ContentService = contentService) {}

  // POST /api/content/generate
  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as GenerateContentInput;
      const result = await this.service.generate(req.user!.userId, input);

      ApiResponse.success(res, {
        statusCode: 200,
        message: "Content generated successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const contentController = new ContentController();
