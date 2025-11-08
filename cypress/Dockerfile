# NASA System 7 Portal - Cypress E2E Testing Dockerfile
FROM cypress/included:13.6.1

# Set the working directory
WORKDIR /e2e

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy the entire client application
COPY ../client ./client

# Install dependencies
RUN npm ci

# Copy Cypress configuration and tests
COPY ./cypress ./cypress
COPY cypress.config.js ./

# Expose the default Cypress port
EXPOSE 8080

# Set the default command to run Cypress tests
CMD ["npx", "cypress", "run", "--browser", "chrome"]