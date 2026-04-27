/**
 * Posts module — Controller layer.
 */
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../utils/apiResponse";
import { postsService, PostsService } from "./posts.service";
import type {
  PublishPostInput,
  SchedulePostInput,
  ListPostsQueryInput,
} from "./posts.validation";

export class PostsController {
  constructor(private service: PostsService = postsService) {}

  publish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as PublishPostInput;
      const post = await this.service.publish(req.user!.userId, data);

      ApiResponse.success(res, {
        statusCode: 201,
        message: "Post publishing started",
        data: post,
      });
    } catch (err) {
      next(err);
    }
  };

  schedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as SchedulePostInput;
      const post = await this.service.schedule(req.user!.userId, data);

      ApiResponse.success(res, {
        statusCode: 201,
        message: "Post scheduled successfully",
        data: post,
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ListPostsQueryInput;
      const result = await this.service.list(req.user!.userId, query);

      ApiResponse.success(res, {
        data: result.items,
        meta: { pagination: result.pagination },
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await this.service.getById(req.user!.userId, req.params.id as string);

      ApiResponse.success(res, {
        data: post,
      });
    } catch (err) {
      next(err);
    }
  };

  retry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await this.service.retry(req.user!.userId, req.params.id as string);

      ApiResponse.success(res, {
        message: "Retry queued for failed platforms",
        data: post,
      });
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.cancel(req.user!.userId, req.params.id as string);

      ApiResponse.success(res, {
        message: "Post cancelled",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const postsController = new PostsController();
