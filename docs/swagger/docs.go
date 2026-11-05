package swagger

import "github.com/swaggo/swag"

const docTemplate = `{
  "swagger": "2.0",
  "info": {
    "title": "{{.Title}}",
    "description": "{{.Description}}",
    "version": "{{.Version}}"
  },
  "basePath": "{{.BasePath}}",
  "schemes": {{ marshal .Schemes }},
  "paths": {
    "/api/websocket-test/{deviceId}/content-sync": {
      "post": {
        "security": [{"BasicAuth": []}],
        "tags": ["websocket-test"],
        "summary": "Send manual content-sync message",
        "description": "Sends a test content-sync websocket payload to a specific device room.",
        "produces": ["application/json"],
        "parameters": [
          {
            "type": "string",
            "description": "Device ID",
            "name": "deviceId",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {"description": "OK"},
          "400": {"description": "Bad Request"},
          "500": {"description": "Internal Server Error"}
        }
      }
    },
    "/api/websocket-test/{deviceId}/device-assigned": {
      "post": {
        "security": [{"BasicAuth": []}],
        "tags": ["websocket-test"],
        "summary": "Send manual device-assigned message",
        "description": "Sends a test device-assigned websocket payload to a specific device room.",
        "produces": ["application/json"],
        "parameters": [
          {
            "type": "string",
            "description": "Device ID",
            "name": "deviceId",
            "in": "path",
            "required": true
          }
        ],
        "responses": {
          "200": {"description": "OK"},
          "400": {"description": "Bad Request"},
          "500": {"description": "Internal Server Error"}
        }
      }
    },
    "/api/websocket-test/{deviceId}/custom": {
      "post": {
        "security": [{"BasicAuth": []}],
        "tags": ["websocket-test"],
        "summary": "Send custom websocket test message",
        "description": "Sends a custom websocket payload to a specific device room.",
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
          {
            "type": "string",
            "description": "Device ID",
            "name": "deviceId",
            "in": "path",
            "required": true
          },
          {
            "description": "Custom websocket payload",
            "name": "request",
            "in": "body",
            "required": true,
            "schema": {"$ref": "#/definitions/websocket_test.wsTestCustomRequest"}
          }
        ],
        "responses": {
          "200": {"description": "OK"},
          "400": {"description": "Bad Request"},
          "500": {"description": "Internal Server Error"}
        }
      }
    }
  },
  "definitions": {
    "websocket_test.wsTestCustomRequest": {
      "type": "object",
      "properties": {
        "action": {
          "type": "string"
        },
        "message": {
          "type": "object",
          "additionalProperties": true
        }
      }
    }
  },
  "securityDefinitions": {
    "BasicAuth": {
      "type": "basic"
    }
  }
}`

var SwaggerInfo = &swag.Spec{
	Version:          "1.0",
	Host:             "",
	BasePath:         "/",
	Schemes:          []string{"http", "https"},
	Title:            "Digital Signage API",
	Description:      "Backend API for digital signage device registration, content sync, and management.",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
