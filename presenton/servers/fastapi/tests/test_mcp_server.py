import asyncio
import pytest
from fastmcp import FastMCP, Client
from app_mcp.tools.start_presentation import register_start_presentation
from app_mcp.tools.help_me import register_help_me
from app_mcp.tools.continue_workflow import register_continue_workflow
from app_mcp.tools.export_presentation import register_export_presentation
from app_mcp.tools.show_layouts import register_show_layouts
from app_mcp.tools.get_status import register_get_status
from app_mcp.tools.choose_layout import register_choose_layout
from app_mcp.services.state_machine.machine import PresentationStateMachine
from app_mcp.services.state_machine.context import StateContext
from unittest.mock import patch, MagicMock


@pytest.fixture
def mcp_server():
    with patch("app_mcp.services.workflow_orchestrator.WorkflowOrchestrator") as MockOrchestrator:
        mock_orchestrator = MockOrchestrator.return_value
        mcp = FastMCP("TestServer")

        #Mocking the StateContext Too
        mock_context = StateContext()
        mock_context.metadata = {}

        mock_fsm = MagicMock(spec=PresentationStateMachine)
        mock_fsm.context = mock_context

        mock_orchestrator.get_session.return_value = mock_fsm

        # Register all tool functions with the mocked orchestrator
        register_start_presentation(mcp=mcp, orchestrator=mock_orchestrator)
        register_help_me(mcp=mcp, orchestrator=mock_orchestrator)
        register_continue_workflow(mcp=mcp, orchestrator=mock_orchestrator)
        register_export_presentation(mcp=mcp, orchestrator=mock_orchestrator)
        register_show_layouts(mcp=mcp, orchestrator=mock_orchestrator)
        register_get_status(mcp=mcp, orchestrator=mock_orchestrator)
        register_choose_layout(mcp=mcp, orchestrator=mock_orchestrator)

        return mcp


# Grouped test classes for each tool


class TestStartPresentation:
    """
    Tests for the start_presentation tool
    """

    def test_success(self, mcp_server):
        """
        Test successful start_presentation call with all required parameters.
        Checks for correct status, session_id, and parameter values in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {
                    "session_id": "test_session",
                    "prompt": "Test Presentation",
                    "files": None,
                    "n_slides": 5,
                    "language": "English"
                }
                result = await client.call_tool("start_presentation", params)
                assert result.data["status"] == "success"
                assert result.data["session_id"] == "test_session"
                assert "message" in result.data
                assert "suggestion" in result.data
                assert "next_step" in result.data
                assert "parameters" in result.data
                assert result.data["parameters"]["n_slides"] == 5
                assert result.data["parameters"]["language"] == "English"
        asyncio.run(run())

    def test_missing_session_id(self, mcp_server):
        """
        Test start_presentation with missing session_id.
        Expects error status and appropriate error message.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"prompt": "Test Presentation", "session_id": ""}
                result = await client.call_tool("start_presentation", params)
                assert result.data["status"] == "error"
                assert "Session ID is required" in result.data["error"]
        asyncio.run(run())

    def test_missing_prompt(self, mcp_server):
        """
        Test start_presentation with missing prompt.
        Expects error status and appropriate error message.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session", "prompt": ""}
                result = await client.call_tool("start_presentation", params)
                assert result.data["status"] == "error"
                assert "Prompt is required" in result.data["error"]
        asyncio.run(run())

    def test_invalid_prompt_type(self, mcp_server):
        """
        Test start_presentation with invalid prompt type (None).
        Expects error status and appropriate error message.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session",
                          "prompt": ""}
                result = await client.call_tool("start_presentation", params)
                assert result.data["status"] == "error"
                assert "Prompt is required" in result.data["error"]
        asyncio.run(run())


class TestHelp:
    """
    Tests for the help tool
    """

    def test_help(self, mcp_server):
        """
        Test help tool with no parameters.
        Checks for info status and presence of help fields in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                result = await client.call_tool("help", {})
                data = result.data
                assert data["status"] == "info"
                assert "message" in data
                assert "workflow" in data
                assert "helpful_commands" in data
                assert "quick_start" in data
                assert "tips" in data
                assert "step_1" in data["workflow"]
                assert "get_status" in data["helpful_commands"]
                assert isinstance(data["tips"], list)
        asyncio.run(run())


class TestContinueWorkflow:
    """
    Tests for the continue_workflow tool
    """

    def test_success(self, mcp_server):
        """
        Test continue_workflow with valid session_id.
        Checks for correct status and required fields in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session"}
                result = await client.call_tool("continue_workflow", params)
                data = result.data
                assert "status" in data
                assert data["status"] in ["success", "error", "info"]
                if data["status"] == "success":
                    assert data["session_id"] == "test_session"
                    assert "next_step" in data
                if data["status"] == "error":
                    assert "error" in data
        asyncio.run(run())

    def test_missing_session_id(self, mcp_server):
        """
        Test continue_workflow with missing session_id.
        Expects error status and appropriate error message.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": ""}
                result = await client.call_tool("continue_workflow", params)
                data = result.data
                assert data["status"] == "error"
                assert "Valid session_id is required" in data["error"]
        asyncio.run(run())


class TestExportPresentation:
    """
    Tests for the export_presentation tool
    """

    def test_success_pptx(self, mcp_server):
        """
        Test export_presentation with format 'pptx'.
        Checks for success status, correct session_id, and pptx path in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session", "format": "pptx"}
                result = await client.call_tool("export_presentation", params)
                data = result.data
                assert "status" in data
                if data["status"] == "success":
                    assert data["session_id"] == "test_session"
                    assert data["message"].endswith("PPTX!")
                    assert "path" in data
                    assert "suggestion" in data
                    assert "available_actions" in data
                if data["status"] == "error":
                    assert "error" in data
        asyncio.run(run())

    def test_success_pdf(self, mcp_server):
        """
        Test export_presentation with format 'pdf'.
        Checks for success status, correct session_id, and pdf path in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session", "format": "pdf"}
                result = await client.call_tool("export_presentation", params)
                data = result.data
                assert "status" in data
                if data["status"] == "success":
                    assert data["session_id"] == "test_session"
                    assert data["message"].endswith("PDF!")
                    assert "path" in data
                if data["status"] == "error":
                    assert "error" in data
        asyncio.run(run())

    def test_invalid_format(self, mcp_server):
        """
        Test export_presentation with invalid format (not 'pdf' or 'pptx').
        Expects error status and appropriate error message.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session", "format": "docx"}
                result = await client.call_tool("export_presentation", params)
                data = result.data
                assert data["status"] == "error"
                assert "Please choose either 'pdf' or 'pptx' format" in data["error"]
        asyncio.run(run())

    def test_missing_session_id(self, mcp_server):
        """
        Test export_presentation with missing session_id.
        Expects error status and session_id error in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "", "format": "pptx"}
                result = await client.call_tool("export_presentation", params)
                data = result.data
                assert data["status"] == "error"
                assert "session_id" in data
        asyncio.run(run())


class TestShowLayouts:
    """
    Tests for the show_layouts tool
    """

    def test_success(self, mcp_server):
        """
        Test show_layouts with valid session_id.
        Checks for success status, layouts list, and suggestion in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session"}
                result = await client.call_tool("show_layouts", params)
                data = result.data
                assert "status" in data
                if data["status"] == "success":
                    assert data["session_id"] == "test_session"
                    assert "layouts" in data
                    assert isinstance(
                        data["layouts"], list) or data["layouts"] is not None
                    assert "message" in data
                    assert "suggestion" in data
                if data["status"] == "error":
                    assert "error" in data
        asyncio.run(run())

    def test_missing_session_id(self, mcp_server):
        """
        Test show_layouts with missing session_id.
        Expects error status and session_id error in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": ""}
                result = await client.call_tool("show_layouts", params)
                data = result.data
                assert data["status"] == "error"
                assert "session_id" in data
        asyncio.run(run())


class TestGetStatus:
    """
    Tests for the get_status tool
    """

    def test_success(self, mcp_server):
        """
        Test get_status with valid session_id.
        Checks for success status, progress, and context in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session"}
                result = await client.call_tool("get_status", params)
                data = result.data
                assert "status" in data
                if data["status"] == "success":
                    assert data["session_id"] == "test_session"
                    assert "current_step" in data
                    assert "progress" in data
                    assert "message" in data
                    assert "next_action" in data
                    assert "context" in data
                if data["status"] == "error":
                    assert "error" in data
        asyncio.run(run())

    def test_missing_session_id(self, mcp_server):
        """
        Test get_status with missing session_id.
        Expects error status and appropriate error message.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": ""}
                result = await client.call_tool("get_status", params)
                data = result.data
                assert data["status"] == "error"
                assert "Valid session_id is required" in data["error"]
        asyncio.run(run())


class TestChooseLayout:
    """
    Tests for the choose_layout tool
    """

    def test_success(self, mcp_server):
        """
        Test choose_layout with valid session_id and layout_name.
        Checks for success status, available actions, and suggestion in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session",
                          "layout_name": "default"}
                result = await client.call_tool("choose_layout", params)
                data = result.data
                assert "status" in data
                if data["status"] == "success":
                    assert data["session_id"] == "test_session"
                    assert "message" in data
                    assert "suggestion" in data
                    assert "available_actions" in data
                if data["status"] == "error":
                    assert "error" in data
        asyncio.run(run())

    def test_missing_session_id(self, mcp_server):
        """
        Test choose_layout with missing session_id.
        Expects error status and session_id error in response.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "", "layout_name": "default"}
                result = await client.call_tool("choose_layout", params)
                data = result.data
                assert data["status"] == "error"
                assert "session_id" in data
        asyncio.run(run())

    def test_missing_layout_name(self, mcp_server):
        """
        Test choose_layout with missing layout_name.
        Checks for error status if layout_name is required.
        """
        async def run():
            async with Client(mcp_server) as client:
                params = {"session_id": "test_session", "layout_name": ""}
                result = await client.call_tool("choose_layout", params)
                data = result.data
                assert "status" in data
                if data["status"] == "error":
                    assert "error" in data
        asyncio.run(run())
