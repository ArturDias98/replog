# Frontend Deployment Bundle

This file contains all files needed to deploy the Angular frontend via AWS Fargate.
Copy each section to the corresponding path in the frontend repository.

---

## `Dockerfile`

Place at the root of the frontend repository. Replace `<your-angular-project-name>` with
the value of `projects.<name>` in your `angular.json` (the built output folder name).

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/<your-angular-project-name>/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## `nginx.conf`

Place at the root of the frontend repository.

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Never cache the app shell, service worker, runtime config, or manifest.
    # Browsers and the SW must always revalidate these on every request.
    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }

    location = /ngsw.json {
        add_header Cache-Control "no-store, must-revalidate";
    }

    location = /ngsw-worker.js {
        add_header Cache-Control "no-store, must-revalidate";
    }

    location = /env.js {
        add_header Cache-Control "no-store, must-revalidate";
    }

    location = /manifest.webmanifest {
        add_header Cache-Control "no-store, must-revalidate";
    }

    # Hashed JS/CSS bundles are safe to cache indefinitely (Angular outputHashing: "all").
    location ~* \.(?:js|css)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

The exact-match `location =` blocks take priority over the regex `location ~*` block, so
`env.js` and `ngsw-worker.js` always get `no-store` instead of the immutable header.

The `try_files` directive ensures Angular client-side routes (e.g. `/workouts`, `/settings`)
serve `index.html` instead of returning 404. This does not interfere with `/api/*` requests —
the ALB intercepts those before they ever reach Nginx.

---

## `.github/workflows/deploy.yml`

Place at `.github/workflows/deploy.yml` in the frontend repository.

Update `AWS_ROLE_ARN` in repository secrets (same OIDC role used for the backend, but ensure
the ECR push permission also covers `replog` repository ARN).

```yaml
name: Deploy Frontend

on:
  push:
    branches:
      - main

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: replog
  ECS_CLUSTER: replog-cluster
  ECS_SERVICE: replog
  CONTAINER_NAME: replog

jobs:
  deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          IMAGE_URI=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker build -t $IMAGE_URI .
          docker push $IMAGE_URI
          echo "image=$IMAGE_URI" >> $GITHUB_OUTPUT

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ${{ env.ECS_SERVICE }} \
            --query taskDefinition \
            > task-definition.json

      - name: Update image in task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

---

## `docs/deployment.md`

Place at `docs/deployment.md` in the frontend repository.

```markdown
# replog — Deployment Guide

## Overview

The frontend is an Angular application served by Nginx inside a Docker container on AWS Fargate.
It is accessible at `https://replog.adrvcode.com`.

API calls from the Angular app target `replog.adrvcode.com/api` — the same domain, so no CORS
configuration is needed.

---

## Prerequisites

- Docker installed locally
- AWS account access (for initial push, if needed)
- The replog CloudFormation stack already deployed (see backend `docs/deployment.md`)

---

## Routine Deploys

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. Builds the Docker image (Node 20 build + Nginx serve)
2. Pushes to the `replog` ECR repository
3. Registers a new ECS task definition revision with the updated image
4. Updates the `replog` ECS service (rolling deploy, zero downtime)

---

## One-Time GitHub Secret

In your GitHub repository → **Settings → Secrets and variables → Actions**, add:

| Secret name  | Value                                              |
|--------------|----------------------------------------------------|
| `AWS_ROLE_ARN` | ARN of the GitHub Actions OIDC role (same as backend) |

---

## Local Docker Verification

```bash
docker build -t replog-local .
docker run --rm -p 4000:80 replog-local
# Visit http://localhost:4000 — Angular app should load
```

Deep links (e.g. `http://localhost:4000/workouts`) should also work thanks to the Nginx
`try_files` directive.

---

## Notes on Nginx Configuration

`nginx.conf` uses `try_files $uri $uri/ /index.html` so Angular handles all routing
client-side. Static assets (JS, CSS, images) are served directly; everything else falls
back to `index.html`.

The ALB path rule `/api/*` is evaluated before requests reach Nginx, so API traffic
is never forwarded to the frontend container.

---

## Infrastructure Reference

| Resource                  | Name / Value          |
|---------------------------|-----------------------|
| ECS Cluster               | `replog-cluster`      |
| Frontend ECS Service      | `replog`     |
| Frontend ECR Repo         | `replog`     |
| CloudWatch Log Group      | `/ecs/replog`|
| Auto-scaling              | CPU 70%, min 2, max 4 |
| Container port            | 80 (Nginx)            |

```
