package com.SGTPI.SystemProject.configurations;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncEmailConfig {

    @Bean(name = "emailExecutor")
    public Executor emailExecutor() {
        // Usa ThreadPoolTaskExecutor para crear un pool de hilos
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5); // Número mínimo de hilos en el pool (ajustar si es necesario)
        executor.setMaxPoolSize(10); // Número máximo de hilos en el pool
        executor.setQueueCapacity(25); // Cantidad de tareas en cola antes de crear un nuevo hilo
        executor.setThreadNamePrefix("EmailSender-"); // Prefijo para los nombres de los hilos
        executor.initialize(); // Inicializa el pool
        return executor;
    }
}
