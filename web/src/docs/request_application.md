# Requesting New Applications Guide

PKG is a community-driven registry. If you rely on an enterprise application that is not currently being tracked, you can request its addition through our official tracking repository.

## The Submission Process

All application requests are managed via this projects [issue tracker](https://github.com/mozzo1000/pkg/issues)

### Step 1: Search Existing Trackers

Before opening a new request, please search the current issues and the registry to ensure the application is not already tracked or under development.

### Step 2: Open a New Issue

Navigate to the GitHub repository at https://github.com/mozzo1000/pkg/issues and select the **Issues** tab. Click on the green **New Issue** button and select the Application Request template.

---

## Required Information

To track applications, we require specific metadata. Please include the following details in your issue:

### 1. Name of the Application

Provide the full, official name of the software (e.g., "Visual Studio Code" rather than "VSCode"). This ensures the registry remains professional and searchable.

### 2. Source URL

Provide a direct link to the applications website, GitHub repository, or official download page.

---

## What Happens Next?

1. **Validation**: A maintainer will review the source URL to determine if the version data can be reliably scraped.
2. **Development**: If neccessary, a new scraper script will be written to target that specific vendor's release page.
3. **Integration**: The application will be added to the global registry, and it will appear on the PKG website.
4. **Subscription**: Once live, you will be able to find the application in your Account Settings and click the bell icon to begin receiving alerts.

---

## Contribution for Developers

If you are a developer and wish to speed up the process, you can submit a **Pull Request** instead of an issue.