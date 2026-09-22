from dataclasses import dataclass

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


@dataclass
class PageParams:
    page: int
    limit: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


def clean_page_params(page: int = 1, limit: int = DEFAULT_LIMIT) -> PageParams:
    page = max(1, page)
    limit = max(1, min(limit, MAX_LIMIT))
    return PageParams(page=page, limit=limit)


def total_pages(total_items: int, limit: int) -> int:
    if total_items == 0:
        return 1
    return (total_items + limit - 1) // limit
