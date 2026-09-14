/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 255).notNullable();
    table.text('body').notNullable();
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('DRAFT')
      .checkIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'], 'chk_posts_status');
    table
      .uuid('category_id')
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL');
    // Cross-service reference to user-service `users.id`.
    // Deliberately NO foreign key here (IRD-002 service-boundary decision).
    table.uuid('author_id').notNullable();
    table.timestamp('published_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('posts', (table) => {
    table.index(['status', 'category_id'], 'idx_posts_status_category');
    table.index(['author_id'], 'idx_posts_author');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('posts');
};
