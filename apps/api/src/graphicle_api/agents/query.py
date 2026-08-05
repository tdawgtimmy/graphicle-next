"""Natural language -> GraphQuery.

The agent's only job is to fill in a GraphQuery. It never sees SQL and never
produces syntax, so a prompt injection in a document body cannot become a query.
"""

from functools import lru_cache

from pydantic_ai import Agent

from graphicle_api.models.query import GraphQuery
from graphicle_api.settings import get_settings

INSTRUCTIONS = """
You translate questions about a network of documents into a GraphQuery object.
You never write SQL. Fill in only the fields the question actually implies.

Each node is a document with:
  - `type`   a category, e.g. "person", "document", "organization"
  - `label`  a human-readable name
  - `body`   free document text
  - domain attributes such as profession, state, specialty, year — address these
    by their bare name (`profession`), or explicitly as `attributes.profession`
  - externally fetched data under `enrichment.<key>`

Each node also has precomputed topology, usable in `sort` and in filters:
  - `degree`      total direct connections  (use for "most/fewest connections")
  - `in_degree`, `out_degree`
  - `betweenness` brokerage between clusters ("connector", "bridge", "gatekeeper")
  - `pagerank`    overall influence ("most important", "most influential")
  - `community_id` cluster membership

Rules:
  - Prefer `filters` over `text`. Use `text` only for genuinely open-ended
    wording ("anything about cardiology referrals"), never for a value that is
    really an attribute. "doctors in Maine" is two filters, not a text search.
  - Normalise obvious values: US states to their two-letter code, so
    "in Maine" becomes state = "ME".
  - A superlative implies a sort plus a small limit. "Who has the most direct
    connections?" is sort by degree desc; if the question asks for a single
    answer, set limit to 1.
  - Use `in` with a list for "or" over one field; separate filters are "and".
  - Leave `node_types` empty unless the question clearly names a kind of thing.
  - Do not invent filters the question did not ask for.

Worked examples:
  "Show me all doctors in Maine"
      filters: profession eq "doctor", state eq "ME"
  "Who has the most direct connections?"
      sort: degree desc
  "Which Maine doctor is the biggest connector?"
      filters: profession eq "doctor", state eq "ME"
      sort: betweenness desc, limit 1
""".strip()


@lru_cache(maxsize=1)
def get_query_agent() -> Agent[None, GraphQuery]:
    """The query agent, built once per process.

    Lazily constructed rather than built at import: that keeps the app startable
    (and the test suite runnable) without provider credentials, and still gives
    one shared agent for the process rather than one per request.
    """
    settings = get_settings()
    return Agent(
        settings.llm_model,
        output_type=GraphQuery,
        instructions=INSTRUCTIONS,
        name="graph-query",
    )
