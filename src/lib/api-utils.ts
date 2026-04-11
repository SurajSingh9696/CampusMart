import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

/**
 * API Error Response Helper
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standard error response formatter
 */
export function errorResponse(error: unknown, defaultMessage = "An error occurred") {
  console.error("[API Error]", error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message || defaultMessage },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: defaultMessage }, { status: 500 });
}

/**
 * Validate request body with Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new ApiError("Invalid JSON in request body", 400, "INVALID_JSON");
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Pagination helper
 */
export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12")));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Assert user is authenticated
 */
export function assertAuthenticated(session: any): asserts session is { user: any } {
  if (!session?.user) {
    throw new ApiError("Authentication required", 401, "UNAUTHORIZED");
  }
}

/**
 * Assert user has specific role
 */
export function assertRole(session: any, role: string | string[]) {
  assertAuthenticated(session);
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(session.user.role)) {
    throw new ApiError(
      `Access denied. Required role: ${roles.join(" or ")}`,
      403,
      "FORBIDDEN"
    );
  }
}

/**
 * Assert seller is approved
 */
export function assertSellerApproved(session: any) {
  assertRole(session, "seller");
  if (session.user.sellerApprovalStatus !== "approved") {
    throw new ApiError(
      "Your seller account is pending approval",
      403,
      "SELLER_NOT_APPROVED"
    );
  }
}

/**
 * Assert user is not blocked
 */
export function assertNotBlocked(session: any) {
  assertAuthenticated(session);
  if (session.user.isBlocked) {
    throw new ApiError(
      "Your account has been blocked",
      403,
      "ACCOUNT_BLOCKED"
    );
  }
}
