import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:http/http.dart' as http;

// ─────────────────────────────────────────────
// DATA MODELS
// ─────────────────────────────────────────────

enum AgentStepStatus { thinking, acting, done, stuck, error }

class AgentStep {
  final int stepNumber;
  final String thinking;
  final String status;
  final String nextAction;
  final List<String> actions;
  final AgentStepStatus stepStatus;
  final String? screenshotBase64;

  AgentStep({
    required this.stepNumber,
    required this.thinking,
    required this.status,
    required this.nextAction,
    required this.actions,
    required this.stepStatus,
    this.screenshotBase64,
  });
}

class AgentSession {
  final String task;
  final List<AgentStep> steps = [];
  final List<String> previousActions = [];
  String lastActionResult = 'none';
  bool isRunning = false;
  bool isDone = false;
  String? doneMessage;
  String? stuckMessage;

  AgentSession({required this.task});
}

// ─────────────────────────────────────────────
// COMET AGENT SERVICE
// ─────────────────────────────────────────────

class CometAgentService {
  static const String _systemPrompt = '''
You are Comet Agent, an elite autonomous browser agent built into the Comet AI Browser.

You perceive the web through three complementary lenses — a live screenshot, OCR-extracted text, and raw DOM HTML — and you act by issuing precise, structured commands that the Comet Browser executes directly on the page.

Your purpose is to accomplish any task a user gives you, fully and autonomously, on any website in the world.

## YOUR ACTION COMMANDS

Respond with one or more actions per step using ONLY these structured commands inside an ```actions``` code block.

NAVIGATE: https://example.com
BACK
REFRESH
CLICK: #css-selector
CLICK: text="Button Text"
CLICK: coords=(x, y)
DOUBLE_CLICK: #css-selector
TYPE: #css-selector | "value to type"
SELECT: #css-selector | "option value"
CHECK: #css-selector
UNCHECK: #css-selector
SCROLL: down | 300
SCROLL: up | 500
SCROLL: to_bottom
SCROLL: to_top
WAIT: 2000
WAIT_FOR: #css-selector | 8000
JS: document.querySelector('#overlay').remove()
EXTRACT: #css-selector | "label"
DONE: "Summary of what was accomplished"
STUCK: "Exact reason why the agent cannot proceed"

## OUTPUT FORMAT (EVERY STEP)

<thinking>
[Your step-by-step reasoning]
</thinking>

**Status:** [What you observe / what just happened]

**Next Action:** [Plain English description of what you are about to do]

```actions
[YOUR ACTION COMMANDS HERE]
```

## CORE RULES

- Be surgical: prefer CSS selector > text > coordinates
- One micro-step at a time (max 3-4 actions per step)
- Use WAIT_FOR after navigation/clicks, not fixed WAIT
- Dismiss popups/cookie banners before main task
- Never loop endlessly — try alternatives, then STUCK
- For purchases/irreversible actions: EXTRACT details and confirm with user first
- If CAPTCHA detected: STUCK with clear message
''';

  final String apiKey;
  final InAppWebViewController? webViewController;

  CometAgentService({
    required this.apiKey,
    this.webViewController,
  });

  // Stream controller for real-time step updates
  final StreamController<AgentStep> _stepController =
      StreamController<AgentStep>.broadcast();
  Stream<AgentStep> get onStep => _stepController.stream;

  AgentSession? _currentSession;
  bool _shouldStop = false;

  void stop() {
    _shouldStop = true;
    _currentSession?.isRunning = false;
  }

  Future<AgentSession> runTask(String task) async {
    _shouldStop = false;
    final session = AgentSession(task: task);
    session.isRunning = true;
    _currentSession = session;

    int stepNumber = 0;
    const int maxSteps = 20;

    while (session.isRunning && !session.isDone && stepNumber < maxSteps) {
      if (_shouldStop) break;

      stepNumber++;

      // 1. Capture current state
      final screenshot = await _captureScreenshot();
      final currentUrl = await _getCurrentUrl();
      final domHtml = await _extractDom();
      final ocrText = await _extractOcrText(screenshot);

      // 2. Build the user message
      final userMessage = _buildUserMessage(
        task: task,
        stepNumber: stepNumber,
        url: currentUrl,
        screenshotBase64: screenshot,
        ocrText: ocrText,
        domHtml: domHtml,
        previousActions: session.previousActions,
        lastActionResult: session.lastActionResult,
      );

      // 3. Call Claude API
      AgentStep step;
      try {
        final response = await _callClaudeAPI(userMessage, screenshot);
        step = _parseResponse(response, stepNumber, screenshot);
      } catch (e) {
        step = AgentStep(
          stepNumber: stepNumber,
          thinking: 'API call failed: $e',
          status: 'Error calling AI',
          nextAction: 'Stopping due to error',
          actions: [],
          stepStatus: AgentStepStatus.error,
          screenshotBase64: screenshot,
        );
        session.isRunning = false;
        _stepController.add(step);
        break;
      }

      session.steps.add(step);
      _stepController.add(step);

      // 4. Check terminal states
      if (step.stepStatus == AgentStepStatus.done) {
        session.isDone = true;
        session.doneMessage = step.actions
            .firstWhere((a) => a.startsWith('DONE:'),
                orElse: () => 'DONE: Task completed')
            .replaceFirst('DONE:', '')
            .trim()
            .replaceAll('"', '');
        break;
      }

      if (step.stepStatus == AgentStepStatus.stuck) {
        session.isRunning = false;
        session.stuckMessage = step.actions
            .firstWhere((a) => a.startsWith('STUCK:'),
                orElse: () => 'STUCK: Cannot proceed')
            .replaceFirst('STUCK:', '')
            .trim()
            .replaceAll('"', '');
        break;
      }

      // 5. Execute actions
      if (step.actions.isNotEmpty && webViewController != null) {
        final executor = AgentActionExecutor(controller: webViewController!);
        final result = await executor.executeActions(step.actions);
        session.lastActionResult = result;
        session.previousActions.addAll(step.actions);
      }

      // Small delay between steps
      await Future.delayed(const Duration(milliseconds: 1500));
    }

    if (stepNumber >= maxSteps && !session.isDone) {
      session.stuckMessage =
          'Reached maximum step limit ($maxSteps steps). Task may need to be broken into smaller parts.';
    }

    session.isRunning = false;
    return session;
  }

  // ─────────────────────────────────────────────
  // STATE CAPTURE
  // ─────────────────────────────────────────────

  Future<String?> _captureScreenshot() async {
    if (webViewController == null) return null;
    try {
      final Uint8List? bytes = await webViewController!.takeScreenshot(
        screenshotConfiguration: ScreenshotConfiguration(
          compressFormat: CompressFormat.JPEG,
          quality: 60,
        ),
      );
      if (bytes == null) return null;
      return base64Encode(bytes);
    } catch (e) {
      debugPrint('[Agent] Screenshot failed: $e');
      return null;
    }
  }

  Future<String> _getCurrentUrl() async {
    if (webViewController == null) return 'unknown';
    try {
      final uri = await webViewController!.getUrl();
      return uri?.toString() ?? 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  Future<String> _extractDom() async {
    if (webViewController == null) return '';
    try {
      final result = await webViewController!.evaluateJavascript(source: '''
        (function() {
          // Get a trimmed, meaningful DOM snapshot
          const clone = document.documentElement.cloneNode(true);
          // Remove scripts, styles, SVG for brevity
          clone.querySelectorAll('script, style, svg, noscript, link[rel="stylesheet"]').forEach(el => el.remove());
          let html = clone.outerHTML;
          // Trim to ~12000 chars
          if (html.length > 12000) {
            html = html.substring(0, 12000) + '... [TRUNCATED]';
          }
          return html;
        })()
      ''');
      return result?.toString() ?? '';
    } catch (e) {
      debugPrint('[Agent] DOM extraction failed: $e');
      return '';
    }
  }

  Future<String> _extractOcrText(String? screenshotBase64) async {
    // Extract visible text from DOM as a proxy for OCR
    // (Real OCR would require a native plugin like google_mlkit_text_recognition)
    if (webViewController == null) return '';
    try {
      final result = await webViewController!.evaluateJavascript(source: '''
        (function() {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
          );
          const texts = [];
          let node;
          while ((node = walker.nextNode())) {
            const text = node.textContent.trim();
            if (text.length > 2) texts.push(text);
          }
          return texts.slice(0, 200).join('\\n');
        })()
      ''');
      return result?.toString() ?? '';
    } catch (e) {
      return '';
    }
  }

  // ─────────────────────────────────────────────
  // MESSAGE BUILDING
  // ─────────────────────────────────────────────

  String _buildUserMessage({
    required String task,
    required int stepNumber,
    required String url,
    String? screenshotBase64,
    required String ocrText,
    required String domHtml,
    required List<String> previousActions,
    required String lastActionResult,
  }) {
    return '''
TASK: $task

STEP: $stepNumber of ongoing execution

URL: $url

OCR_TEXT:
${ocrText.isEmpty ? '[No text extracted]' : ocrText.substring(0, ocrText.length.clamp(0, 3000))}

DOM_HTML:
${domHtml.isEmpty ? '[No DOM available]' : domHtml}

PREVIOUS_ACTIONS:
${previousActions.isEmpty ? '[None]' : previousActions.join('\n')}

LAST_ACTION_RESULT: $lastActionResult
''';
  }

  // ─────────────────────────────────────────────
  // CLAUDE API CALL
  // ─────────────────────────────────────────────

  Future<String> _callClaudeAPI(
      String userMessage, String? screenshotBase64) async {
    final List<Map<String, dynamic>> content = [];

    // Add screenshot if available
    if (screenshotBase64 != null && screenshotBase64.isNotEmpty) {
      content.add({
        'type': 'image',
        'source': {
          'type': 'base64',
          'media_type': 'image/jpeg',
          'data': screenshotBase64,
        },
      });
    }

    // Add text message
    content.add({
      'type': 'text',
      'text': userMessage,
    });

    final body = jsonEncode({
      'model': 'claude-opus-4-5',
      'max_tokens': 4096,
      'system': _systemPrompt,
      'messages': [
        {
          'role': 'user',
          'content': content,
        }
      ],
    });

    final response = await http
        .post(
          Uri.parse('https://api.anthropic.com/v1/messages'),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: body,
        )
        .timeout(const Duration(seconds: 60));

    if (response.statusCode != 200) {
      throw Exception(
          'Claude API error ${response.statusCode}: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return data['content'][0]['text'] as String;
  }

  // ─────────────────────────────────────────────
  // RESPONSE PARSING
  // ─────────────────────────────────────────────

  AgentStep _parseResponse(
      String response, int stepNumber, String? screenshot) {
    // Extract <thinking> block
    final thinkingMatch =
        RegExp(r'<thinking>([\s\S]*?)<\/thinking>').firstMatch(response);
    final thinking = thinkingMatch?.group(1)?.trim() ?? '';

    // Extract **Status:** line
    final statusMatch = RegExp(r'\*\*Status:\*\*\s*(.+)').firstMatch(response);
    final status = statusMatch?.group(1)?.trim() ?? '';

    // Extract **Next Action:** line
    final nextActionMatch =
        RegExp(r'\*\*Next Action:\*\*\s*(.+)').firstMatch(response);
    final nextAction = nextActionMatch?.group(1)?.trim() ?? '';

    // Extract ```actions``` block
    final actionsMatch =
        RegExp(r'```actions\n([\s\S]*?)```').firstMatch(response);
    final actionsBlock = actionsMatch?.group(1) ?? '';
    final actions = actionsBlock
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();

    // Determine step status
    AgentStepStatus stepStatus = AgentStepStatus.acting;
    if (actions.any((a) => a.startsWith('DONE:'))) {
      stepStatus = AgentStepStatus.done;
    } else if (actions.any((a) => a.startsWith('STUCK:'))) {
      stepStatus = AgentStepStatus.stuck;
    } else if (thinking.isNotEmpty && actions.isEmpty) {
      stepStatus = AgentStepStatus.thinking;
    }

    return AgentStep(
      stepNumber: stepNumber,
      thinking: thinking,
      status: status,
      nextAction: nextAction,
      actions: actions,
      stepStatus: stepStatus,
      screenshotBase64: screenshot,
    );
  }

  void dispose() {
    _stepController.close();
  }
}

// ─────────────────────────────────────────────
// ACTION EXECUTOR
// ─────────────────────────────────────────────

class AgentActionExecutor {
  final InAppWebViewController controller;

  AgentActionExecutor({required this.controller});

  Future<String> executeActions(List<String> actions) async {
    final results = <String>[];

    for (final action in actions) {
      try {
        final result = await _executeAction(action);
        results.add(result);
      } catch (e) {
        results.add('failed: $e');
        debugPrint('[Agent] Action failed: $action — $e');
      }
    }

    final hasFailure = results.any((r) => r.startsWith('failed'));
    final hasSuccess = results.any((r) => r == 'success');

    if (hasFailure && hasSuccess) return 'partial — some actions failed';
    if (hasFailure)
      return 'failed — ${results.firstWhere((r) => r.startsWith('failed'))}';
    return 'success';
  }

  Future<String> _executeAction(String action) async {
    // NAVIGATE
    if (action.startsWith('NAVIGATE:')) {
      final url = action.replaceFirst('NAVIGATE:', '').trim();
      await controller.loadUrl(urlRequest: URLRequest(url: WebUri(url)));
      await Future.delayed(const Duration(milliseconds: 2000));
      return 'success';
    }

    // BACK
    if (action == 'BACK') {
      await controller.goBack();
      return 'success';
    }

    // REFRESH
    if (action == 'REFRESH') {
      await controller.reload();
      return 'success';
    }

    // CLICK
    if (action.startsWith('CLICK:')) {
      final target = action.replaceFirst('CLICK:', '').trim();
      return await _click(target);
    }

    // DOUBLE_CLICK
    if (action.startsWith('DOUBLE_CLICK:')) {
      final selector = action.replaceFirst('DOUBLE_CLICK:', '').trim();
      await controller.evaluateJavascript(source: '''
        const el = document.querySelector('$selector');
        if (el) { el.dispatchEvent(new MouseEvent('dblclick', {bubbles: true})); }
      ''');
      return 'success';
    }

    // TYPE
    if (action.startsWith('TYPE:')) {
      final parts = action.replaceFirst('TYPE:', '').split('|');
      if (parts.length >= 2) {
        final selector = parts[0].trim();
        final value = parts[1].trim().replaceAll('"', '');
        await controller.evaluateJavascript(source: '''
          const el = document.querySelector('$selector');
          if (el) {
            el.focus();
            el.value = '';
            el.value = ${jsonEncode(value)};
            el.dispatchEvent(new Event('input', {bubbles: true}));
            el.dispatchEvent(new Event('change', {bubbles: true}));
          }
        ''');
        return 'success';
      }
      return 'failed: invalid TYPE format';
    }

    // SELECT
    if (action.startsWith('SELECT:')) {
      final parts = action.replaceFirst('SELECT:', '').split('|');
      if (parts.length >= 2) {
        final selector = parts[0].trim();
        final value = parts[1].trim().replaceAll('"', '');
        await controller.evaluateJavascript(source: '''
          const el = document.querySelector('$selector');
          if (el) {
            el.value = ${jsonEncode(value)};
            el.dispatchEvent(new Event('change', {bubbles: true}));
          }
        ''');
        return 'success';
      }
      return 'failed: invalid SELECT format';
    }

    // CHECK / UNCHECK
    if (action.startsWith('CHECK:') || action.startsWith('UNCHECK:')) {
      final isCheck = action.startsWith('CHECK:');
      final selector =
          action.replaceFirst(isCheck ? 'CHECK:' : 'UNCHECK:', '').trim();
      await controller.evaluateJavascript(source: '''
        const el = document.querySelector('$selector');
        if (el) { el.checked = $isCheck; el.dispatchEvent(new Event('change', {bubbles: true})); }
      ''');
      return 'success';
    }

    // SCROLL
    if (action.startsWith('SCROLL:')) {
      final params = action.replaceFirst('SCROLL:', '').trim();
      if (params == 'to_bottom') {
        await controller.evaluateJavascript(
            source: 'window.scrollTo(0, document.body.scrollHeight)');
      } else if (params == 'to_top') {
        await controller.evaluateJavascript(source: 'window.scrollTo(0, 0)');
      } else if (params.startsWith('to_element |')) {
        final selector = params.replaceFirst('to_element |', '').trim();
        await controller.evaluateJavascript(source: '''
          document.querySelector('$selector')?.scrollIntoView({behavior: 'smooth'});
        ''');
      } else {
        final parts = params.split('|');
        final direction = parts[0].trim();
        final amount =
            int.tryParse(parts.length > 1 ? parts[1].trim() : '300') ?? 300;
        final delta = direction == 'up' ? -amount : amount;
        await controller.evaluateJavascript(
            source: 'window.scrollBy(0, $delta)');
      }
      return 'success';
    }

    // WAIT
    if (action.startsWith('WAIT:')) {
      final ms = int.tryParse(action.replaceFirst('WAIT:', '').trim()) ?? 1000;
      await Future.delayed(Duration(milliseconds: ms.clamp(100, 10000)));
      return 'success';
    }

    // WAIT_FOR
    if (action.startsWith('WAIT_FOR:')) {
      final parts = action.replaceFirst('WAIT_FOR:', '').split('|');
      final selector = parts[0].trim();
      final timeout =
          int.tryParse(parts.length > 1 ? parts[1].trim() : '5000') ?? 5000;
      await _waitForElement(selector, timeout);
      return 'success';
    }

    // JS
    if (action.startsWith('JS:')) {
      final code = action.replaceFirst('JS:', '').trim();
      await controller.evaluateJavascript(source: code);
      return 'success';
    }

    // EXTRACT
    if (action.startsWith('EXTRACT:')) {
      final parts = action.replaceFirst('EXTRACT:', '').split('|');
      final selector = parts[0].trim();
      final result = await controller.evaluateJavascript(source: '''
        document.querySelector('$selector')?.textContent?.trim() ?? ''
      ''');
      return 'extracted: $result';
    }

    // DONE / STUCK — handled by caller
    if (action.startsWith('DONE:') || action.startsWith('STUCK:')) {
      return 'terminal';
    }

    return 'unknown action: $action';
  }

  Future<String> _click(String target) async {
    // coords=(x, y)
    if (target.startsWith('coords=')) {
      final match = RegExp(r'coords=\((\d+),\s*(\d+)\)').firstMatch(target);
      if (match != null) {
        final x = int.parse(match.group(1)!);
        final y = int.parse(match.group(2)!);
        await controller.evaluateJavascript(source: '''
          document.elementFromPoint($x, $y)?.click();
        ''');
        return 'success';
      }
    }

    // text="..."
    if (target.startsWith('text=')) {
      final text = target.replaceFirst('text=', '').replaceAll('"', '').trim();
      await controller.evaluateJavascript(source: '''
        (function() {
          const els = document.querySelectorAll('button, a, [role="button"], input[type="submit"], label');
          for (const el of els) {
            if (el.textContent.trim().includes(${jsonEncode(text)})) {
              el.click();
              return true;
            }
          }
          // Try XPath as fallback
          const result = document.evaluate(
            '//*[contains(text(), ${jsonEncode(text)})]',
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
          );
          result.singleNodeValue?.click();
        })()
      ''');
      return 'success';
    }

    // xpath=...
    if (target.startsWith('xpath=')) {
      final xpath = target.replaceFirst('xpath=', '').trim();
      await controller.evaluateJavascript(source: '''
        const result = document.evaluate(
          ${jsonEncode(xpath)}, document, null,
          XPathResult.FIRST_ORDERED_NODE_TYPE, null
        );
        result.singleNodeValue?.click();
      ''');
      return 'success';
    }

    // CSS selector (default)
    await controller.evaluateJavascript(source: '''
      document.querySelector(${jsonEncode(target)})?.click();
    ''');
    return 'success';
  }

  Future<void> _waitForElement(String selector, int timeoutMs) async {
    final start = DateTime.now();
    while (DateTime.now().difference(start).inMilliseconds < timeoutMs) {
      final found = await controller.evaluateJavascript(source: '''
        !!document.querySelector(${jsonEncode(selector)})
      ''');
      if (found == true || found == 'true') return;
      await Future.delayed(const Duration(milliseconds: 500));
    }
  }
}
