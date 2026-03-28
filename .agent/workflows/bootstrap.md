---
description: Zero-to-hero Bootstrap for InspectionOS Agent and System
---

# Instructions

When starting fresh on a new machine or a pulled repository for Inspection.OS, execute these steps seamlessly:

1. Validate Python is installed and execute pip install
// turbo
`cd mirror-pack-agent && pip install -r requirements.txt -r requirements-dev.txt`

2. Validate npm is installed and execute package generation
// turbo
`cd Inspections_OS && npm install`

3. (Optional) Run the local acquisition bootstrapper
`cd mirror-pack-agent && ./scripts/bootstrap_workspace.sh`

4. Validate Docker containers build correctly for full system alignment
// turbo
`docker-compose build`

