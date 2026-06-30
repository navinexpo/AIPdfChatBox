"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    document_type = postgresql.ENUM(
        "pdf", "docx", "markdown", "txt", name="document_type", create_type=True
    )
    document_status = postgresql.ENUM(
        "uploading", "queued", "processing", "ready", "failed",
        name="document_status", create_type=True,
    )
    message_role = postgresql.ENUM(
        "user", "assistant", "system", name="message_role", create_type=True
    )
    document_type.create(op.get_bind(), checkfirst=True)
    document_status.create(op.get_bind(), checkfirst=True)
    message_role.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("organizations.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("organizations.id", ondelete="SET NULL")),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("file_type", postgresql.ENUM(name="document_type", create_type=False), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("status", postgresql.ENUM(name="document_status", create_type=False),
                  nullable=False, server_default="queued"),
        sa.Column("status_message", sa.Text()),
        sa.Column("page_count", sa.Integer()),
        sa.Column("chunk_count", sa.Integer()),
        sa.Column("uploaded_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        sa.Column("processed_at", sa.TIMESTAMP(timezone=True)),
    )
    op.create_index("idx_documents_user_id", "documents", ["user_id"])

    op.create_table(
        "chats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False, server_default="New chat"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_chats_user_id", "chats", ["user_id"])

    op.create_table(
        "chat_documents",
        sa.Column("chat_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", postgresql.ENUM(name="message_role", create_type=False), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_chat_messages_chat_id", "chat_messages", ["chat_id", "created_at"])

    op.create_table(
        "message_citations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("message_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page", sa.Integer()),
        sa.Column("snippet", sa.Text(), nullable=False),
        sa.Column("score", sa.REAL(), nullable=False),
        sa.Column("chunk_index", sa.Integer()),
    )
    op.create_index("idx_message_citations_message_id", "message_citations", ["message_id"])


def downgrade() -> None:
    op.drop_index("idx_message_citations_message_id", table_name="message_citations")
    op.drop_table("message_citations")
    op.drop_index("idx_chat_messages_chat_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_table("chat_documents")
    op.drop_index("idx_chats_user_id", table_name="chats")
    op.drop_table("chats")
    op.drop_index("idx_documents_user_id", table_name="documents")
    op.drop_table("documents")
    op.drop_table("users")
    op.drop_table("organizations")
    op.execute("DROP TYPE IF EXISTS message_role")
    op.execute("DROP TYPE IF EXISTS document_status")
    op.execute("DROP TYPE IF EXISTS document_type")
