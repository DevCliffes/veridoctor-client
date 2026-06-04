import {
  ACCESS_TOKEN_KEY,
  AUTH_CODE_KEY,
  LOGGED_IN_KEY,
  REFRESH_TOKEN_KEY,
  IDENTITY_KEY,
} from "@veridoctor/api-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export type TokenPayload = {
  a_token: string;
  refresh_token: string;
};

/**
 * checks authentication tokens for a user and redirects accordingly for each route
 * @param request next request
 * @returns redirects to the route o
 */
export async function proxy(request: NextRequest) {
  const authUrl = process.env.NEXT_PUBLIC_WEB_APP_URL;
  const cookieStore = await cookies();

  const aToken = cookieStore.get(ACCESS_TOKEN_KEY);
  const rToken = cookieStore.get(REFRESH_TOKEN_KEY);
  const loggedIn = cookieStore.get(LOGGED_IN_KEY);
  const identity = cookieStore.get(IDENTITY_KEY);
  const authCode = cookieStore.get(AUTH_CODE_KEY);

  /**
   * allow access to the root to allow access token requeest
   */
  if (request.nextUrl.basePath === "/") {
    return;
  }

  if (!aToken || !rToken) {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/identity/authorise?auth_code=${authCode}&identity=${identity}`,
      {
        method: "POST",
      },
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((result: TokenPayload) => {
        cookieStore.set(ACCESS_TOKEN_KEY, result.a_token);
        cookieStore.set(REFRESH_TOKEN_KEY, result.refresh_token);
        cookieStore.set(LOGGED_IN_KEY, "true");
        cookieStore.delete(AUTH_CODE_KEY);
      })
      .catch((err) => {
        // TODO: fix this, return a proper user friendly page for this errror type
        console.error(err);
        throw Error("token failed.");
      });
  } else {
  }
  console.log("THE access token is", aToken);
  console.log("THE refresh token is", rToken);
  console.log("THE ISLOGGED IN IS", loggedIn);

  //   if (!aToken?.value || !rToken?.value) {
  //     // return
  //     return NextResponse.redirect(`${authUrl}/auth/login`);
  //   }
}
