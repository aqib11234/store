from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class with flexible page sizes and detailed metadata
    """
    page_size = 25  # Default page size
    page_size_query_param = 'page_size'  # Allow client to set page size with ?page_size=50
    max_page_size = 100  # Maximum allowed page size
    page_query_param = 'page'  # Page number parameter

    def get_paginated_response(self, data):
        """
        Return a paginated style Response object with additional metadata
        """
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'has_next': self.page.has_next(),
            'has_previous': self.page.has_previous(),
        })


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination class for large datasets (like products with 1400+ items)
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'has_next': self.page.has_next(),
            'has_previous': self.page.has_previous(),
        })


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination class for smaller datasets (like customers, suppliers)
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'has_next': self.page.has_next(),
            'has_previous': self.page.has_previous(),
        })