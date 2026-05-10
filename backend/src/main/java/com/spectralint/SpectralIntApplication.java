package com.spectralint;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class SpectralIntApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpectralIntApplication.class, args);
    }
}
