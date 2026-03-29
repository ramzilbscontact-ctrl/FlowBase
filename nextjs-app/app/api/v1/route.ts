// GET /api/v1 — API documentation (OpenAPI-lite JSON)
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'FlowBase CRM Public API',
    version: '1.0.0',
    base_url: '/api/v1',
    authentication: {
      type: 'bearer',
      header: 'Authorization: Bearer <api_key>',
      description:
        'All endpoints require a valid API key. Generate keys from the FlowBase dashboard settings. Keys use SHA-256 hashing and are prefixed with "fb_live_".',
    },
    pagination: {
      description: 'List endpoints support pagination via query params.',
      params: {
        page: 'Page number (default: 1)',
        per_page: 'Items per page (default: 25, max: 100)',
      },
      response_format: {
        data: 'Array of resources',
        pagination: {
          page: 'Current page',
          per_page: 'Items per page',
          total: 'Total number of items',
          total_pages: 'Total number of pages',
        },
      },
    },
    webhooks: {
      description:
        'Configure webhooks in the dashboard to receive real-time notifications for CRM events. Payloads are signed with HMAC-SHA256.',
      headers: {
        'X-FlowBase-Event': 'Event name (e.g. contact.created)',
        'X-FlowBase-Signature': 'HMAC-SHA256 signature of the request body',
        'X-FlowBase-Timestamp': 'ISO 8601 timestamp of the event',
      },
      events: [
        'contact.created',
        'contact.updated',
        'contact.deleted',
        'deal.created',
        'deal.updated',
        'invoice.created',
        'task.created',
        'task.updated',
      ],
    },
    endpoints: {
      contacts: {
        list: {
          method: 'GET',
          path: '/api/v1/contacts',
          description: 'List contacts with pagination and filtering',
          query_params: {
            page: 'Page number',
            per_page: 'Items per page',
            email: 'Filter by email (partial match)',
            company: 'Filter by company name (partial match)',
            tags: 'Filter by tags (comma-separated, overlap match)',
            q: 'Full-text search across name, email, company',
          },
        },
        get: {
          method: 'GET',
          path: '/api/v1/contacts/:id',
          description: 'Get a single contact by ID',
        },
        create: {
          method: 'POST',
          path: '/api/v1/contacts',
          description: 'Create a new contact',
          body: {
            first_name: 'string (optional)',
            last_name: 'string (optional)',
            email: 'string (optional)',
            phone: 'string (optional)',
            company_id: 'uuid (optional)',
            company_name: 'string (optional)',
            tags: 'string[] (optional)',
            notes: 'string (optional)',
          },
        },
        update: {
          method: 'PATCH',
          path: '/api/v1/contacts/:id',
          description: 'Update a contact (partial update)',
          body: 'Same fields as create (all optional)',
        },
        delete: {
          method: 'DELETE',
          path: '/api/v1/contacts/:id',
          description: 'Soft-delete a contact',
        },
      },
      deals: {
        list: {
          method: 'GET',
          path: '/api/v1/deals',
          description: 'List deals with pagination and filtering',
          query_params: {
            page: 'Page number',
            per_page: 'Items per page',
            stage_id: 'Filter by pipeline stage UUID',
            assigned_to: 'Filter by assignee user UUID',
            contact_id: 'Filter by contact UUID',
            q: 'Full-text search on deal title',
          },
        },
        get: {
          method: 'GET',
          path: '/api/v1/deals/:id',
          description: 'Get a single deal by ID',
        },
        create: {
          method: 'POST',
          path: '/api/v1/deals',
          description: 'Create a new deal',
          body: {
            title: 'string (required)',
            value: 'number (optional, default 0)',
            stage_id: 'uuid (optional)',
            contact_id: 'uuid (optional)',
            company_id: 'uuid (optional)',
            assigned_to: 'uuid (optional)',
          },
        },
        update: {
          method: 'PATCH',
          path: '/api/v1/deals/:id',
          description: 'Update a deal (partial update)',
          body: 'Same fields as create plus closed_at (all optional)',
        },
      },
      invoices: {
        list: {
          method: 'GET',
          path: '/api/v1/invoices',
          description: 'List invoices with pagination and filtering',
          query_params: {
            page: 'Page number',
            per_page: 'Items per page',
            status: 'Filter by status (draft, sent, paid, overdue, cancelled)',
            contact_id: 'Filter by contact UUID',
          },
        },
        get: {
          method: 'GET',
          path: '/api/v1/invoices/:id',
          description: 'Get a single invoice with line items',
        },
        create: {
          method: 'POST',
          path: '/api/v1/invoices',
          description: 'Create a new invoice',
          body: {
            invoice_number: 'string (required, must be unique)',
            contact_id: 'uuid (optional)',
            company_id: 'uuid (optional)',
            status: 'string (optional, default: draft)',
            issue_date: 'date string (optional, default: today)',
            due_date: 'date string (optional)',
            subtotal: 'number (optional)',
            tax_rate: 'number (optional, percentage)',
            notes: 'string (optional)',
            items: [
              {
                description: 'string (required)',
                quantity: 'number (optional, default 1)',
                unit_price: 'number (optional, default 0)',
              },
            ],
          },
        },
      },
      tasks: {
        list: {
          method: 'GET',
          path: '/api/v1/tasks',
          description: 'List tasks with pagination and filtering',
          query_params: {
            page: 'Page number',
            per_page: 'Items per page',
            completed: 'Filter by completion (true/false)',
            assigned_to: 'Filter by assignee user UUID',
            deal_id: 'Filter by deal UUID',
            contact_id: 'Filter by contact UUID',
          },
        },
        get: {
          method: 'GET',
          path: '/api/v1/tasks/:id',
          description: 'Get a single task by ID',
        },
        create: {
          method: 'POST',
          path: '/api/v1/tasks',
          description: 'Create a new task',
          body: {
            title: 'string (required)',
            description: 'string (optional)',
            due_date: 'ISO 8601 datetime (optional)',
            completed: 'boolean (optional, default false)',
            contact_id: 'uuid (optional)',
            deal_id: 'uuid (optional)',
            assigned_to: 'uuid (optional)',
          },
        },
        update: {
          method: 'PATCH',
          path: '/api/v1/tasks/:id',
          description: 'Update a task (partial update). Setting completed=true auto-sets completed_at.',
          body: 'Same fields as create (all optional)',
        },
      },
    },
    errors: {
      format: { error: 'string' },
      status_codes: {
        '200': 'Success',
        '201': 'Created',
        '400': 'Bad Request — invalid input',
        '401': 'Unauthorized — missing or invalid API key',
        '403': 'Forbidden — insufficient permissions',
        '404': 'Not Found',
        '422': 'Unprocessable Entity — validation failed',
        '500': 'Internal Server Error',
      },
    },
  })
}
