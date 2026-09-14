/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    // Cross-service reference to user-service `users.id`.
    // Deliberately NO foreign key here (IRD-002 service-boundary decision).
    table.uuid('user_id').notNullable();
    table.text('body').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('comments', (table) => {
    table.index(['post_id'], 'idx_comments_post');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('comments');
};
