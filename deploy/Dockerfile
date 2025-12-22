# Use the official PHP 8.4 FPM Alpine image for a smaller footprint
FROM php:8.4-fpm-alpine

# Update package index and install system dependencies
RUN apk update && apk add --no-cache \
    mysql-client \
    libzip-dev \
    zip \
    unzip \
    git \
    nodejs \
    npm \
    && docker-php-ext-install pdo pdo_mysql zip \
    && rm -rf /var/cache/apk/*

# Install Composer from the official image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files first for better caching
COPY composer.json composer.lock* ./

# Install PHP dependencies
# Use build arg to control dev dependencies (default: install dev deps for development)
ARG INSTALL_DEV=true
RUN if [ "$INSTALL_DEV" = "true" ] ; then \
    composer install --optimize-autoloader --no-interaction --prefer-dist ; \
    else \
    composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist ; \
    fi || true

# Copy package files for npm
COPY package.json package-lock.json* ./

# Install Node dependencies
RUN if [ "$INSTALL_DEV" = "true" ] ; then \
    npm ci || npm install ; \
    else \
    npm ci --only=production || npm install --only=production ; \
    fi || true

# Copy existing application files
COPY . .

# Build frontend assets
RUN npm run build || true

# Set permissions for Laravel
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
