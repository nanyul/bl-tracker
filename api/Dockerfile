# Build de dependencias PHP
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Runtime Apache + PHP para Render
FROM php:8.2-apache
RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite headers \
    && sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && printf '<Directory /var/www/html/public>\n\tAllowOverride All\n\tRequire all granted\n</Directory>\n' > /etc/apache2/conf-available/app.conf \
    && a2enconf app

COPY --from=vendor /app/vendor /var/www/html/vendor
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
# Render inyecta $PORT (default 10000): Apache debe escuchar ahí
CMD ["sh", "-c", "sed -i \"s/80/${PORT:-80}/g\" /etc/apache2/ports.conf /etc/apache2/sites-enabled/000-default.conf && apache2-foreground"]
