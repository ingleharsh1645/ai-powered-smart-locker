package com.lockerbuddy.controller;

import com.lockerbuddy.service.AiAssistantService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AiAssistantController {
    private final AiAssistantService aiAssistantService;

    @PostMapping("/ask")
    public Map<String, String> askRobot(@RequestBody AskRequest request) {
        String answer = aiAssistantService.answerQuestion(
                request.getQuestion(),
                request.getStudentId(),
                request.getGrade()
        );
        return Map.of("answer", answer, "modelUsed", "spring-boot-assistant");
    }

    @Data
    public static class AskRequest {
        private String question;
        private Long studentId;
        private String grade;
    }
}
