package com.drinksaver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Reject unsupported uploads before CSRF or MVC can trigger multipart parsing. */
public class RejectMultipartRequestsFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String contentType = request.getContentType();
        if (contentType != null && contentType.stripLeading().regionMatches(true, 0, "multipart/", 0, 10)) {
            // The API has no uploads. sendError would dispatch to /error and could parse the body again.
            response.setStatus(HttpServletResponse.SC_UNSUPPORTED_MEDIA_TYPE);
            return;
        }
        filterChain.doFilter(request, response);
    }
}
