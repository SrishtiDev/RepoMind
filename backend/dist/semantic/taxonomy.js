"use strict";
/**
 * taxonomy.ts - Defines the fixed set of semantic business-purpose tags
 * and their descriptions for the LLM to use when categorizing code nodes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TAGS = exports.TAXONOMY = void 0;
exports.TAXONOMY = {
    "auth": "Authentication, authorization, session/token handling",
    "payment": "Payment processing, billing, transactions",
    "data-layer": "Database queries, ORM models, data access",
    "api-route": "HTTP route handlers, controllers",
    "validation": "Input validation, schema checking",
    "error-handling": "Error handling, logging, exception management",
    "config": "Configuration, environment setup, constants",
    "util": "Generic helper/utility functions with no domain-specific purpose",
    "test": "Test files, test helpers, mocks",
    "ui-component": "Frontend UI components",
    "external-integration": "Third-party API/service integration",
    "business-logic": "Core domain logic not covered by the above",
    "other": "Doesn't clearly fit any category above"
};
exports.VALID_TAGS = new Set(Object.keys(exports.TAXONOMY));
//# sourceMappingURL=taxonomy.js.map