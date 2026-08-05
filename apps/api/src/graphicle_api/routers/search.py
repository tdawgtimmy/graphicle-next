from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncConnection

from graphicle_api.agents.query import get_query_agent
from graphicle_api.db.session import get_connection
from graphicle_api.models.query import GraphQuery, SearchRequest, SearchResponse
from graphicle_api.services.compile import UnknownFieldError, compile_query
from graphicle_api.services.store import fetch_subgraph

router = APIRouter(prefix="/api", tags=["search"])

#: FastAPI's current dependency style. Also keeps `Depends()` out of argument
#: defaults, which is a genuine Python foot-gun the linter is right to flag.
DbConnection = Annotated[AsyncConnection, Depends(get_connection)]


async def _run_query(
    connection: AsyncConnection, question: str, query: GraphQuery
) -> SearchResponse:
    try:
        statement = compile_query(query)
    except UnknownFieldError as exc:
        # A well-formed query naming a field we cannot resolve is a bad request,
        # not a server fault — surface it so the caller can correct the field.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    subgraph = await fetch_subgraph(connection, statement, limit=query.limit)

    return SearchResponse(
        question=question,
        interpreted=query,
        nodes=subgraph.nodes,
        edges=subgraph.edges,
        truncated=subgraph.truncated,
    )


@router.post(
    "/search",
    response_model=SearchResponse,
    summary="Ask a question in natural language",
)
async def search(
    payload: SearchRequest,
    connection: DbConnection,
) -> SearchResponse:
    """Interpret a question as a GraphQuery, run it, and return both.

    The interpretation comes back with the results so the UI can show what the
    question was understood to mean, and hand it to `/api/graph/query` to re-run
    a corrected version without paying for another LLM call.
    """
    run = await get_query_agent().run(payload.question)
    return await _run_query(connection, payload.question, run.output)


@router.post(
    "/graph/query",
    response_model=SearchResponse,
    summary="Run a structured query directly",
)
async def run_structured_query(
    payload: GraphQuery,
    connection: DbConnection,
) -> SearchResponse:
    """Run a GraphQuery with no LLM involved.

    This is the deterministic half of search: same compiler, same results, no
    model call. Use it for saved queries, faceted filtering, and for re-running
    an interpretation the user edited.
    """
    return await _run_query(connection, question="", query=payload)
